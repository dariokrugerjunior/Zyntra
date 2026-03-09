import { Queue, Worker } from "bullmq";
import crypto from "node:crypto";
import axios from "axios";
import { prisma } from "../db/prisma";
import { logger } from "../../shared/utils/logger";
import { env } from "../../config/env";

export const QUEUES = {
  sessionStart: "session-start",
  sessionStop: "session-stop",
  sessionPurge: "session-purge",
  sendText: "message-send-text",
  sendMedia: "message-send-media",
  webhookDeliver: "webhook-deliver"
} as const;

const connection = { url: env.REDIS_URL };

export const sessionStartQueue = new Queue(QUEUES.sessionStart, { connection });
export const sessionStopQueue = new Queue(QUEUES.sessionStop, { connection });
export const sessionPurgeQueue = new Queue(QUEUES.sessionPurge, { connection });
export const sendTextQueue = new Queue(QUEUES.sendText, { connection });
export const sendMediaQueue = new Queue(QUEUES.sendMedia, { connection });
export const webhookDeliverQueue = new Queue(QUEUES.webhookDeliver, { connection });

const retrySeconds = [10, 30, 120, 600, 1800];

export function startWebhookDeliveryWorker() {
  const worker = new Worker(
    QUEUES.webhookDeliver,
    async (job) => {
      const deliveryId = String(job.data.deliveryId);
      const delivery = await prisma.webhookDelivery.findUnique({
        where: { id: deliveryId },
        include: { webhook: true }
      });

      if (!delivery || delivery.status === "success") {
        return;
      }

      const payloadString = JSON.stringify(delivery.payload);
      const signature = crypto
        .createHmac("sha256", delivery.webhook.secret)
        .update(payloadString)
        .digest("hex");

      try {
        await prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: { attempt: delivery.attempt + 1 }
        });

        await axios.post(delivery.webhook.url, delivery.payload, {
          timeout: 10000,
          headers: {
            "Content-Type": "application/json",
            "X-Signature": `sha256=${signature}`,
            "X-Event-Type": delivery.eventType,
            "X-Company-Id": delivery.companyId,
            "X-Session-Id": String((delivery.payload as any).sessionId ?? ""),
            "X-Delivery-Id": delivery.id
          }
        });

        await prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: "success",
            lastError: null,
            nextRetryAt: null
          }
        });

        logger.info({ deliveryId: delivery.id }, "webhook delivered");
      } catch (error: any) {
        const retriesDone = delivery.attempt + 1;
        const retryDelay = retrySeconds[delivery.attempt];

        if (!retryDelay) {
          await prisma.webhookDelivery.update({
            where: { id: delivery.id },
            data: {
              status: "failed",
              lastError: String(error?.message ?? "unknown")
            }
          });
          logger.error({ deliveryId: delivery.id, err: error?.message }, "webhook delivery failed permanently");
          return;
        }

        const nextRetryAt = new Date(Date.now() + retryDelay * 1000);
        await prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: "pending",
            nextRetryAt,
            lastError: String(error?.message ?? "unknown")
          }
        });

        await webhookDeliverQueue.add(
          `retry-${delivery.id}-${retriesDone}`,
          { deliveryId: delivery.id },
          { delay: retryDelay * 1000, removeOnComplete: true, removeOnFail: false }
        );

        logger.warn({ deliveryId: delivery.id, retryDelay, err: error?.message }, "webhook delivery scheduled for retry");
      }
    },
    { connection }
  );

  worker.on("failed", (job, err) => {
    logger.error({ queue: QUEUES.webhookDeliver, jobId: job?.id, err: err.message }, "webhook queue job failed");
  });

  return worker;
}
