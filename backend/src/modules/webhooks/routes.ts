import { Router } from "express";
import { z } from "zod";
import { createWebhook, deleteWebhook, listWebhooks, updateWebhook } from "./service";

export const webhooksRouter = Router();

webhooksRouter.post("/webhooks", async (req, res) => {
  const created = await createWebhook(req.context!.companyId, req.body);
  return res.status(201).json(created);
});

webhooksRouter.get("/webhooks", async (req, res) => {
  const items = await listWebhooks(req.context!.companyId);
  return res.json(items);
});

webhooksRouter.patch("/webhooks/:id", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const result = await updateWebhook(req.context!.companyId, id, req.body);
  if (!result.count) {
    return res.status(404).json({ error: "webhook_not_found" });
  }
  return res.status(200).json({ ok: true });
});

webhooksRouter.delete("/webhooks/:id", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const result = await deleteWebhook(req.context!.companyId, id);
  if (!result.count) {
    return res.status(404).json({ error: "webhook_not_found" });
  }
  return res.status(204).send();
});
