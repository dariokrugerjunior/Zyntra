import { env } from "./config/env";
import { buildServer } from "./infra/http/server";
import { logger } from "./shared/utils/logger";
import { startWebhookDeliveryWorker } from "./infra/queue/bullmq";
import { purgeInactiveSessionsOlderThanOneDay } from "./modules/sessions/service";

const INACTIVE_PURGE_RUN_EVERY_MS = 60 * 60 * 1000;

async function main() {
  logger.info(
    {
      NODE_ENV: env.NODE_ENV,
      PORT: env.PORT,
      DATABASE_URL: env.DATABASE_URL.replace(/:[^:@/]+@/, ":***@"),
      REDIS_URL: env.REDIS_URL
    },
    "backend config loaded"
  );

  startWebhookDeliveryWorker();

  const runInactiveSessionPurge = async () => {
    try {
      const result = await purgeInactiveSessionsOlderThanOneDay();
      logger.info(result, "inactive session purge cycle completed");
    } catch (error) {
      logger.error({ err: error }, "inactive session purge cycle failed");
    }
  };

  await runInactiveSessionPurge();
  setInterval(runInactiveSessionPurge, INACTIVE_PURGE_RUN_EVERY_MS);

  const app = buildServer();
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "backend listening");
  });
}

main().catch((error) => {
  logger.error({ err: error }, "backend startup failed");
  process.exit(1);
});
