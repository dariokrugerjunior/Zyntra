import { Router } from "express";
import { z } from "zod";
import { enqueueMediaMessage, enqueueTextMessage, listSessionConversations, listSessionMessages } from "./service";

export const messagesRouter = Router();

messagesRouter.get("/sessions/:id/messages", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const items = await listSessionMessages(req.context!.companyId, id, req.query);
  return res.json(items);
});

messagesRouter.get("/sessions/:id/conversations", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const items = await listSessionConversations(req.context!.companyId, id, req.query);
  return res.json(items);
});

messagesRouter.post("/sessions/:id/messages/text", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const idempotencyKey = req.header("Idempotency-Key") ?? undefined;
  const result = await enqueueTextMessage(req.context!.companyId, id, req.body, idempotencyKey);
  return res.status(202).json(result);
});

messagesRouter.post("/sessions/:id/messages/media", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const idempotencyKey = req.header("Idempotency-Key") ?? undefined;
  const result = await enqueueMediaMessage(req.context!.companyId, id, req.body, idempotencyKey);
  return res.status(202).json(result);
});
