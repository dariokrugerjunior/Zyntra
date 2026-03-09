import { z } from "zod";
import { prisma } from "../../infra/db/prisma";
import { sessionStartQueue, sessionStopQueue } from "../../infra/queue/bullmq";
import { redis } from "../../infra/redis/redis";
import { HttpError } from "../../shared/errors/http-error";

const createSessionSchema = z.object({
  name: z.string().min(2).max(80)
});

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
