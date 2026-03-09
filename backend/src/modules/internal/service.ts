import { MessageDirection, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infra/db/prisma";
import { enqueueWebhookDeliveries } from "../webhooks/service";
import { logger } from "../../shared/utils/logger";
import { sendTextQueue } from "../../infra/queue/bullmq";
import OpenAI from "openai";

const workerEventSchema = z.object({
  eventType: z.enum([
    "session.qr",
    "session.ready",
    "session.disconnected",
    "history.sync",
    "message.received",
    "message.sent",
    "message.error"
  ]),
  companyId: z.string().uuid(),
  sessionId: z.string().uuid(),
  payload: z.record(z.any())
});

function sanitizePayload(payload: Record<string, unknown>) {
  const cloned = { ...payload };
  for (const key of ["base64", "qrBase64", "raw"]) {
    if (typeof cloned[key] === "string" && (cloned[key] as string).length > 180) {
      cloned[key] = `${String(cloned[key]).slice(0, 180)}...[truncated]`;
    }
  }
  return cloned;
}

function buildMockAutoReply(promptText: string) {
  return promptText.trim();
}

async function generateOpenAIReply(input: {
  apiToken: string;
  instructions: string;
  incomingText: string;
}) {
  const client = new OpenAI({
    apiKey: input.apiToken
  });

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5",
    instructions: input.instructions,
    input: [
      {
        role: "user",
        content: input.incomingText
      }
    ]
  });

  const reply = String(response.output_text ?? "").trim();
  if (!reply) {
    throw new Error("empty_response_from_model");
  }
  return reply;
}

type AutoReplyRuntimeConfig = {
  enabled: boolean;
  promptText: string | null;
  provider: string;
  apiToken: string | null;
};

export async function ingestWorkerEvent(input: unknown) {
  const event = workerEventSchema.parse(input);
  const payload = sanitizePayload(event.payload);

  if (event.eventType === "session.qr") {
    await prisma.waSession.updateMany({
      where: { id: event.sessionId, companyId: event.companyId },
      data: {
        status: "qr",
        latestQr: (event.payload.qrString as string | undefined) ?? (event.payload.qrBase64 as string | undefined)
      }
    });
  }

  if (event.eventType === "session.ready") {
    await prisma.waSession.updateMany({
      where: { id: event.sessionId, companyId: event.companyId },
      data: {
        status: "ready",
        phoneNumber: (event.payload.phoneNumber as string | undefined) ?? null,
        lastSeenAt: new Date()
      }
    });
  }

  if (event.eventType === "session.disconnected") {
    await prisma.waSession.updateMany({
      where: { id: event.sessionId, companyId: event.companyId },
      data: {
        status: "disconnected",
        lastSeenAt: new Date()
      }
    });
  }

  if (event.eventType === "message.received") {
    await prisma.message.create({
      data: {
        companyId: event.companyId,
        sessionId: event.sessionId,
        direction: "in",
        to: (event.payload.to as string | undefined) ?? null,
        from: (event.payload.from as string | undefined) ?? null,
        waMessageId: (event.payload.waMessageId as string | undefined) ?? null,
        payload: payload as Prisma.InputJsonValue
      }
    });

    const configRows = await prisma.$queryRaw<AutoReplyRuntimeConfig[]>`
      SELECT "enabled", "promptText", "provider", "apiToken"
      FROM "SessionAutoReplyConfig"
      WHERE "sessionId" = ${event.sessionId}::uuid
      LIMIT 1
    `;
    const config = configRows[0];

    const to = (event.payload.from as string | undefined) ?? null;
    const incomingText =
      (event.payload.text as string | undefined) ??
      (event.payload.caption as string | undefined) ??
      null;

    if (config?.enabled && config.promptText?.trim() && to && to !== "status@broadcast") {
      const promptText = config.promptText.trim();
      const userMessage = incomingText?.trim() || "(sem texto)";

      let generatedText = buildMockAutoReply(promptText);

      if (config.provider === "openai" && config.apiToken?.trim()) {
        try {
          generatedText = await generateOpenAIReply({
            apiToken: config.apiToken.trim(),
            instructions: promptText,
            incomingText: userMessage
          });
        } catch (error) {
          logger.error(
            { companyId: event.companyId, sessionId: event.sessionId, err: error },
            "auto-reply openai failed, falling back to promptText"
          );
          generatedText = "Estivemos Problema em Responder a sua Mensagem. Por favor, tente novamente mais tarde."
        }
      }

      await sendTextQueue.add(
        `auto-reply-${event.companyId}-${event.sessionId}-${Date.now()}`,
        {
          companyId: event.companyId,
          sessionId: event.sessionId,
          to,
          text: generatedText
        },
        { removeOnComplete: true, removeOnFail: false }
      );
    }
  }

  if (event.eventType === "message.sent") {
    await prisma.message.create({
      data: {
        companyId: event.companyId,
        sessionId: event.sessionId,
        direction: "out",
        to: (event.payload.to as string | undefined) ?? null,
        from: (event.payload.from as string | undefined) ?? null,
        waMessageId: (event.payload.waMessageId as string | undefined) ?? null,
        payload: payload as Prisma.InputJsonValue
      }
    });
  }

  if (event.eventType === "message.error") {
    await prisma.waSession.updateMany({
      where: { id: event.sessionId, companyId: event.companyId },
      data: { status: "error", lastSeenAt: new Date() }
    });
  }

  if (event.eventType === "history.sync") {
    const rawMessages = Array.isArray(event.payload.messages) ? event.payload.messages : [];

    const incoming = rawMessages
      .map((item) => {
        const message = item as Record<string, unknown>;
        const waMessageId = typeof message.waMessageId === "string" ? message.waMessageId : null;
        const direction: MessageDirection = message.direction === "out" ? "out" : "in";
        if (!waMessageId) return null;

        return {
          companyId: event.companyId,
          sessionId: event.sessionId,
          direction,
          waMessageId,
          to: typeof message.to === "string" ? message.to : null,
          from: typeof message.from === "string" ? message.from : null,
          payload: (typeof message.payload === "object" && message.payload
            ? (message.payload as Prisma.InputJsonValue)
            : ({} as Prisma.InputJsonValue)),
          createdAt: typeof message.createdAt === "string" ? new Date(message.createdAt) : new Date()
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (incoming.length > 0) {
      const messageIds = incoming.map((item) => item.waMessageId);
      const existing = await prisma.message.findMany({
        where: {
          companyId: event.companyId,
          sessionId: event.sessionId,
          waMessageId: { in: messageIds }
        },
        select: { waMessageId: true }
      });
      const existingSet = new Set(existing.map((item) => item.waMessageId).filter(Boolean) as string[]);
      const toInsert = incoming.filter((item) => !existingSet.has(item.waMessageId));

      if (toInsert.length > 0) {
        await prisma.message.createMany({
          data: toInsert
        });
      }
    }
  }

  const envelope = {
    eventType: event.eventType,
    companyId: event.companyId,
    sessionId: event.sessionId,
    data: payload,
    timestamp: new Date().toISOString()
  };

  await enqueueWebhookDeliveries(event.companyId, event.eventType, event.sessionId, envelope);
  logger.info({ eventType: event.eventType, companyId: event.companyId, sessionId: event.sessionId }, "worker event ingested");
}
