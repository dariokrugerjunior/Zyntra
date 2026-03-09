import pino from "pino";
import { env } from "../../config/env";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: ["req.headers.authorization", "req.headers.x-api-key", "headers.authorization", "headers.x-api-key"]
});
