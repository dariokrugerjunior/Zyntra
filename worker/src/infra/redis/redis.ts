import Redis from "ioredis";
import { env } from "../../shared/utils/env";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});
