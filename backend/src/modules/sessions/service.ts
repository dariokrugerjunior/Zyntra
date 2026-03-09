import { z } from "zod";
import { randomUUID } from "node:crypto";
import { prisma } from "../../infra/db/prisma";
import { sessionPurgeQueue, sessionStartQueue, sessionStopQueue } from "../../infra/queue/bullmq";
import { redis } from "../../infra/redis/redis";
import { HttpError } from "../../shared/errors/http-error";

const createSessionSchema = z.object({
  name: z.string().min(2).max(80)
});

const upsertAutoReplySchema = z
  .object({
    enabled: z.boolean(),
    promptText: z.string().max(10000).optional(),
    provider: z.enum(["mock", "openai"]).default("mock"),
    apiToken: z.string().max(2048).optional()
  })
  .superRefine((value, ctx) => {
    if (value.enabled && !value.promptText?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["promptText"],
        message: "prompt_text_required_when_enabled"
      });
    }
    if (value.enabled && value.provider === "openai" && !value.apiToken?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["apiToken"],
        message: "api_token_required_for_openai"
      });
    }
  });

type AutoReplyConfigRow = {
  enabled: boolean;
  promptText: string | null;
  provider: string;
  apiToken: string | null;
  updatedAt: Date;
};

export async function createSession(companyId: string, body: unknown) {
  const data = createSessionSchema.parse(body);
  return prisma.waSession.create({
    data: {
      companyId,
      name: data.name,
      status: "created"
    }
  });
}

export async function listSessions(companyId: string) {
  return prisma.waSession.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" }
  });
}

export async function getSessionById(companyId: string, sessionId: string) {
  const session = await prisma.waSession.findFirst({
    where: { id: sessionId, companyId }
  });

  if (!session) {
    throw new HttpError(404, "session_not_found");
  }

  return session;
}

async function acquireSessionLock(companyId: string, sessionId: string, action: "start" | "stop") {
  const lockKey = `lock:session:${companyId}:${sessionId}:${action}`;
  const result = await redis.set(lockKey, "1", "EX", 30, "NX");
  if (!result) {
    throw new HttpError(409, "session_locked");
  }
}

export async function startSession(companyId: string, sessionId: string) {
  await getSessionById(companyId, sessionId);
  await acquireSessionLock(companyId, sessionId, "start");

  await prisma.waSession.update({
    where: { id: sessionId },
    data: { status: "starting" }
  });

  const job = await sessionStartQueue.add(
    `start-${companyId}-${sessionId}-${Date.now()}`,
    { companyId, sessionId },
    { removeOnComplete: true, removeOnFail: false }
  );

  return { jobId: job.id, status: "starting" };
}

export async function stopSession(companyId: string, sessionId: string) {
  await getSessionById(companyId, sessionId);
  await acquireSessionLock(companyId, sessionId, "stop");

  await prisma.waSession.update({
    where: { id: sessionId },
    data: { status: "stopped", lastSeenAt: new Date() }
  });

  const job = await sessionStopQueue.add(
    `stop-${companyId}-${sessionId}-${Date.now()}`,
    { companyId, sessionId },
    { removeOnComplete: true, removeOnFail: false }
  );

  return { jobId: job.id, status: "stopped" };
}

export async function syncSessionHistory(companyId: string, sessionId: string) {
  await getSessionById(companyId, sessionId);
  await acquireSessionLock(companyId, sessionId, "stop");
  await acquireSessionLock(companyId, sessionId, "start");

  await prisma.waSession.update({
    where: { id: sessionId },
    data: { status: "starting" }
  });

  const stopJob = await sessionStopQueue.add(
    `sync-stop-${companyId}-${sessionId}-${Date.now()}`,
    { companyId, sessionId },
    { removeOnComplete: true, removeOnFail: false }
  );

  const startJob = await sessionStartQueue.add(
    `sync-start-${companyId}-${sessionId}-${Date.now()}`,
    { companyId, sessionId },
    { delay: 2500, removeOnComplete: true, removeOnFail: false }
  );

  return {
    status: "syncing",
    stopJobId: stopJob.id,
    startJobId: startJob.id
  };
}

export async function deleteSession(companyId: string, sessionId: string) {
  await getSessionById(companyId, sessionId);

  await sessionPurgeQueue.add(
    `purge-${companyId}-${sessionId}-${Date.now()}`,
    { companyId, sessionId },
    { removeOnComplete: true, removeOnFail: false }
  );

  await prisma.waSession.delete({
    where: { id: sessionId }
  });

  await redis.del(`lock:session:${companyId}:${sessionId}:start`, `lock:session:${companyId}:${sessionId}:stop`);
}

export async function getSessionAutoReplyConfig(companyId: string, sessionId: string) {
  await getSessionById(companyId, sessionId);

  const rows = await prisma.$queryRaw<AutoReplyConfigRow[]>`
    SELECT "enabled", "promptText", "provider", "apiToken", "updatedAt"
    FROM "SessionAutoReplyConfig"
    WHERE "sessionId" = ${sessionId}::uuid
    LIMIT 1
  `;
  const config = rows[0];

  return (
    config ?? {
      enabled: false,
      promptText: "",
      provider: "mock" as const,
      apiToken: "",
      updatedAt: null
    }
  );
}

export async function upsertSessionAutoReplyConfig(companyId: string, sessionId: string, body: unknown) {
  await getSessionById(companyId, sessionId);
  const data = upsertAutoReplySchema.parse(body);
  const promptText = data.promptText?.trim() ?? null;
  const apiToken = data.apiToken?.trim() ?? null;

  await prisma.$executeRaw`
    INSERT INTO "SessionAutoReplyConfig"
      ("id", "companyId", "sessionId", "enabled", "promptText", "provider", "apiToken", "createdAt", "updatedAt")
    VALUES
      (${randomUUID()}::uuid, ${companyId}::uuid, ${sessionId}::uuid, ${data.enabled}, ${promptText}, ${data.provider}::"AutoReplyProvider", ${apiToken}, NOW(), NOW())
    ON CONFLICT ("sessionId")
    DO UPDATE SET
      "enabled" = EXCLUDED."enabled",
      "promptText" = EXCLUDED."promptText",
      "provider" = EXCLUDED."provider",
      "apiToken" = EXCLUDED."apiToken",
      "updatedAt" = NOW()
  `;

  const rows = await prisma.$queryRaw<AutoReplyConfigRow[]>`
    SELECT "enabled", "promptText", "provider", "apiToken", "updatedAt"
    FROM "SessionAutoReplyConfig"
    WHERE "sessionId" = ${sessionId}::uuid
    LIMIT 1
  `;
  const config = rows[0];
  return {
    enabled: config?.enabled ?? false,
    promptText: config?.promptText ?? null,
    provider: (config?.provider as "mock" | "openai") ?? "mock",
    apiToken: config?.apiToken ?? null,
    updatedAt: config?.updatedAt ?? null
  };
}
