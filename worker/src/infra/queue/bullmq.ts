import { Job, Queue, Worker } from "bullmq";
import { env } from "../../shared/utils/env";

export const QUEUES = {
  sessionStart: "session-start",
  sessionStop: "session-stop",
  sessionPurge: "session-purge",
  sendText: "message-send-text",
  sendMedia: "message-send-media"
} as const;

const connection = { url: env.REDIS_URL };

export const sessionStartQueue = new Queue(QUEUES.sessionStart, { connection });
export const sessionStopQueue = new Queue(QUEUES.sessionStop, { connection });
export const sessionPurgeQueue = new Queue(QUEUES.sessionPurge, { connection });
export const sendTextQueue = new Queue(QUEUES.sendText, { connection });
export const sendMediaQueue = new Queue(QUEUES.sendMedia, { connection });

export function createQueueWorker(name: string, processor: (job: Job) => Promise<void>) {
  return new Worker(name, processor, { connection });
}
