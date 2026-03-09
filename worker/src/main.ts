import { createQueueWorker, QUEUES } from "./infra/queue/bullmq";
import { logger } from "./shared/logger/logger";
import { env } from "./shared/utils/env";
import { startSessionJob } from "./jobs/startSession.job";
import { stopSessionJob } from "./jobs/stopSession.job";
import { sendTextJob } from "./jobs/sendText.job";
import { sendMediaJob } from "./jobs/sendMedia.job";

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

  const workers = [
    createQueueWorker(QUEUES.sessionStart, async (job) => {
      logger.info({ queue: QUEUES.sessionStart, jobId: job.id }, "processing job");
      await startSessionJob(job.data);
    }),
    createQueueWorker(QUEUES.sessionStop, async (job) => {
      logger.info({ queue: QUEUES.sessionStop, jobId: job.id }, "processing job");
      await stopSessionJob(job.data);
    }),
    createQueueWorker(QUEUES.sendText, async (job) => {
      logger.info({ queue: QUEUES.sendText, jobId: job.id }, "processing job");
      await sendTextJob(job.data);
    }),
    createQueueWorker(QUEUES.sendMedia, async (job) => {
      logger.info({ queue: QUEUES.sendMedia, jobId: job.id }, "processing job");
      await sendMediaJob(job.data);
    })
  ];

  for (const w of workers) {
    w.on("failed", (job, err) => {
      logger.error({ queue: w.name, jobId: job?.id, err: err.message }, "job failed");
    });
  }

  logger.info("worker ready");
}

main().catch((error) => {
  logger.error({ err: error }, "worker startup failed");
  process.exit(1);
});
