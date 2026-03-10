import { createQueueWorker, QUEUES, sendMediaQueue, sendTextQueue } from "./infra/queue/bullmq";
import { redis } from "./infra/redis/redis";
import { logger } from "./shared/logger/logger";
import { env } from "./shared/utils/env";
import { startSessionJob } from "./jobs/startSession.job";
import { stopSessionJob } from "./jobs/stopSession.job";
import { sendTextJob } from "./jobs/sendText.job";
import { sendMediaJob } from "./jobs/sendMedia.job";
import { purgeSessionJob } from "./jobs/purgeSession.job";
import { cleanupOrphanSessionStorage } from "./infra/storage/orphan-cleanup";

const ORPHAN_STORAGE_CLEANUP_EVERY_MS = 60 * 60 * 1000;
const WORKER_HEARTBEAT_KEY = "worker:heartbeat";
const WORKER_HEARTBEAT_TTL_SECONDS = 30;
const WORKER_HEARTBEAT_EVERY_MS = 10_000;

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "unhandled promise rejection");
});

process.on("uncaughtException", (error) => {
  logger.error({ err: error }, "uncaught exception");
});

async function main() {
  logger.info(
    {
      NODE_ENV: env.NODE_ENV,
      REDIS_URL: env.REDIS_URL,
      BACKEND_INTERNAL_URL: env.BACKEND_INTERNAL_URL,
      BAILEYS_STORAGE_PATH: env.BAILEYS_STORAGE_PATH
    },
    "worker config loaded"
  );

  await sendTextQueue.drain(true);
  await sendMediaQueue.drain(true);
  logger.warn("pending message queues drained on startup");

  const heartbeatTick = async () => {
    await redis.set(WORKER_HEARTBEAT_KEY, String(Date.now()), "EX", WORKER_HEARTBEAT_TTL_SECONDS);
  };

  await heartbeatTick();
  setInterval(() => {
    heartbeatTick().catch((error) => {
      logger.error({ err: error }, "worker heartbeat failed");
    });
  }, WORKER_HEARTBEAT_EVERY_MS);

  const workers = [
    createQueueWorker(QUEUES.sessionStart, async (job) => {
      logger.info({ queue: QUEUES.sessionStart, jobId: job.id }, "processing job");
      await startSessionJob(job.data);
    }),
    createQueueWorker(QUEUES.sessionStop, async (job) => {
      logger.info({ queue: QUEUES.sessionStop, jobId: job.id }, "processing job");
      await stopSessionJob(job.data);
    }),
    createQueueWorker(QUEUES.sessionPurge, async (job) => {
      logger.info({ queue: QUEUES.sessionPurge, jobId: job.id }, "processing job");
      await purgeSessionJob(job.data);
    }),
    createQueueWorker(QUEUES.sendText, async (job) => {
      logger.info({ queue: QUEUES.sendText, jobId: job.id }, "processing job");
      await sendTextJob(job.data);
    }, { maxStalledCount: 0 }),
    createQueueWorker(QUEUES.sendMedia, async (job) => {
      logger.info({ queue: QUEUES.sendMedia, jobId: job.id }, "processing job");
      await sendMediaJob(job.data);
    }, { maxStalledCount: 0 })
  ];

  for (const w of workers) {
    w.on("failed", (job, err) => {
      logger.error({ queue: w.name, jobId: job?.id, err: err.message }, "job failed");
    });
  }

  const runOrphanStorageCleanup = async () => {
    try {
      await cleanupOrphanSessionStorage();
    } catch (error) {
      logger.error({ err: error }, "orphan session storage cleanup failed");
    }
  };

  await runOrphanStorageCleanup();
  setInterval(runOrphanStorageCleanup, ORPHAN_STORAGE_CLEANUP_EVERY_MS);

  logger.info("worker ready");
}

main().catch((error) => {
  logger.error({ err: error }, "worker startup failed");
  process.exit(1);
});
