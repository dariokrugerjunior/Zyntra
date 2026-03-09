import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infra/db/prisma";
import { webhookDeliverQueue } from "../../infra/queue/bullmq";

const webhookSchema = z.object({
  url: z.string().url(),
  secret: z.string().min(8).max(200),
  events: z.array(z.string().min(3)).min(1)
});

const updateWebhookSchema = webhookSchema.partial().extend({
  isActive: z.boolean().optional()
});

export async function createWebhook(companyId: string, body: unknown) {
  const data = webhookSchema.parse(body);
  return prisma.webhook.create({
    data: {
      companyId,
      url: data.url,
      secret: data.secret,
      eventsJson: data.events,
      isActive: true
    }
  });
}

export async function listWebhooks(companyId: string) {
  return prisma.webhook.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" }
  });
}

export async function updateWebhook(companyId: string, webhookId: string, body: unknown) {
  const data = updateWebhookSchema.parse(body);
  return prisma.webhook.updateMany({
    where: { id: webhookId, companyId },
    data: {
      url: data.url,
      secret: data.secret,
      eventsJson: data.events,
      isActive: data.isActive
    }
  });
}

export async function deleteWebhook(companyId: string, webhookId: string) {
  return prisma.webhook.deleteMany({ where: { id: webhookId, companyId } });
}

export async function enqueueWebhookDeliveries(
  companyId: string,
  eventType: string,
  sessionId: string,
  payload: Record<string, unknown>
) {
  const webhooks = await prisma.webhook.findMany({
    where: {
      companyId,
      isActive: true,
      eventsJson: {
        array_contains: [eventType]
      }
    }
  });

  for (const webhook of webhooks) {
    const delivery = await prisma.webhookDelivery.create({
      data: {
        companyId,
        webhookId: webhook.id,
        eventType,
        payload: payload as Prisma.InputJsonValue,
        attempt: 0,
        status: "pending"
      }
    });

    await webhookDeliverQueue.add(
      `webhook-${delivery.id}`,
      { deliveryId: delivery.id },
      { removeOnComplete: true, removeOnFail: false }
    );
  }
}
