import { MessageDirection, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infra/db/prisma";
import { enqueueWebhookDeliveries } from "../webhooks/service";
import { logger } from "../../shared/utils/logger";

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

