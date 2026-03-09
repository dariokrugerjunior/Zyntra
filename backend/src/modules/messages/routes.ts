import { Router } from "express";
import { z } from "zod";
import { enqueueMediaMessage, enqueueTextMessage } from "./service";

export const messagesRouter = Router();

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
