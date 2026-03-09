import pino from "pino";
import { env } from "../utils/env";

export const logger = pino({ level: env.LOG_LEVEL });
