import { z } from "zod";
import { prisma } from "../../infra/db/prisma";
import { sendMediaQueue, sendTextQueue } from "../../infra/queue/bullmq";
import { redis } from "../../infra/redis/redis";
import { HttpError } from "../../shared/errors/http-error";

const sendTextSchema = z.object({
  to: z.string().min(6).max(32),
  text: z.string().min(1).max(4096)
});

const sendMediaSchema = z.object({
  to: z.string().min(6).max(32),
  base64: z.string().min(1),
  mime: z.string().min(3),
  fileName: z.string().max(200).optional(),
  caption: z.string().max(1024).optional()
});

const listMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  with: z.string().min(3).max(40).optional()
});

const listConversationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20000).optional(),
  search: z.string().min(2).max(40).optional()
});

async function enforceRateLimit(companyId: string, sessionId: string) {
  const second = Math.floor(Date.now() / 1000);
  const companyKey = `rl:company:${companyId}:${second}`;
  const sessionKey = `rl:session:${sessionId}:${second}`;

  const [companyCount, sessionCount] = await redis
    .multi()
    .incr(companyKey)
    .expire(companyKey, 1)
    .incr(sessionKey)
    .expire(sessionKey, 1)
    .exec()
    .then((r) => [Number(r?.[0]?.[1] ?? 0), Number(r?.[2]?.[1] ?? 0)]);

  if (companyCount > 20) {
    throw new HttpError(429, "company_rate_limit_exceeded");
  }

  if (sessionCount > 5) {
    throw new HttpError(429, "session_rate_limit_exceeded");
  }
}

async function enforceIdempotency(companyId: string, sessionId: string, idempotencyKey?: string) {
  if (!idempotencyKey) return;

  const key = `idem:${companyId}:${sessionId}:${idempotencyKey}`;
  const result = await redis.set(key, "1", "EX", 600, "NX");
  if (!result) {
    throw new HttpError(409, "duplicate_request");
  }
}

async function requireReadySession(companyId: string, sessionId: string) {
  const session = await prisma.waSession.findFirst({
    where: { id: sessionId, companyId }
  });

  if (!session) {
    throw new HttpError(404, "session_not_found");
  }

  if (session.status !== "ready") {
    throw new HttpError(409, "session_not_ready");
  }

  return session;
}

export async function enqueueTextMessage(
  companyId: string,
  sessionId: string,
  payload: unknown,
  idempotencyKey?: string
) {
  const data = sendTextSchema.parse(payload);
  await requireReadySession(companyId, sessionId);
  await enforceRateLimit(companyId, sessionId);
  await enforceIdempotency(companyId, sessionId, idempotencyKey);

  const job = await sendTextQueue.add(
    `send-text-${companyId}-${sessionId}-${Date.now()}`,
    {
      companyId,
      sessionId,
      to: data.to,
      text: data.text
    },
    { removeOnComplete: true, removeOnFail: false }
  );

  return { jobId: job.id, status: "queued" };
}

export async function enqueueMediaMessage(
  companyId: string,
  sessionId: string,
  payload: unknown,
  idempotencyKey?: string
) {
  const data = sendMediaSchema.parse(payload);
  await requireReadySession(companyId, sessionId);
  await enforceRateLimit(companyId, sessionId);
  await enforceIdempotency(companyId, sessionId, idempotencyKey);

  const job = await sendMediaQueue.add(
    `send-media-${companyId}-${sessionId}-${Date.now()}`,
    {
      companyId,
      sessionId,
      to: data.to,
      base64: data.base64,
      mime: data.mime,
      fileName: data.fileName,
      caption: data.caption
    },
    { removeOnComplete: true, removeOnFail: false }
  );

  return { jobId: job.id, status: "queued" };
}

export async function listSessionMessages(companyId: string, sessionId: string, query: unknown) {
  const data = listMessagesQuerySchema.parse(query);
  const session = await prisma.waSession.findFirst({
    where: { id: sessionId, companyId },
    select: { id: true }
  });
  if (!session) {
    throw new HttpError(404, "session_not_found");
  }

  const contact = data.with?.trim();

  const messages = await prisma.message.findMany({
    where: {
      companyId,
      sessionId,
      ...(contact
        ? {
            OR: [
              { to: { contains: contact } },
              { from: { contains: contact } }
            ]
          }
        : {})
    },
    orderBy: { createdAt: "desc" },
    take: data.limit
  });

  return messages;
}

function messagePreview(payload: Record<string, unknown>) {
  const text = String(payload.text ?? "").trim();
  if (text) return text;
  const caption = String(payload.caption ?? "").trim();
  if (caption) return caption;
  const fileName = String(payload.fileName ?? "").trim();
  if (fileName) return `[midia] ${fileName}`;
  return "[sem texto]";
}

function messageContact(message: { direction: "in" | "out"; to: string | null; from: string | null }) {
  return message.direction === "out" ? message.to : message.from;
}

export async function listSessionConversations(companyId: string, sessionId: string, query: unknown) {
  const data = listConversationsQuerySchema.parse(query);

  const session = await prisma.waSession.findFirst({
    where: { id: sessionId, companyId },
    select: { id: true }
  });
  if (!session) {
    throw new HttpError(404, "session_not_found");
  }

  const rows = await prisma.message.findMany({
    where: { companyId, sessionId },
    orderBy: { createdAt: "desc" }
  });

  const conversations = new Map<
    string,
    {
      id: string;
      contact: string;
      lastMessageAt: string;
      lastDirection: "in" | "out";
      lastPreview: string;
      totalMessages: number;
    }
  >();

  for (const row of rows) {
    const contact = messageContact({
      direction: row.direction as "in" | "out",
      to: row.to,
      from: row.from
    });
    if (!contact) continue;

    if (data.search && !contact.includes(data.search.trim())) {
      continue;
    }

    const existing = conversations.get(contact);
    if (!existing) {
      conversations.set(contact, {
        id: contact,
        contact,
        lastMessageAt: row.createdAt.toISOString(),
        lastDirection: row.direction as "in" | "out",
        lastPreview: messagePreview((row.payload ?? {}) as Record<string, unknown>),
        totalMessages: 1
      });
      continue;
    }

    existing.totalMessages += 1;
  }

  const all = Array.from(conversations.values()).sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );

  return data.limit ? all.slice(0, data.limit) : all;
}
