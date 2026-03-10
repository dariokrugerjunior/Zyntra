import { Router } from "express";
import { env } from "../../config/env";
import { ingestWorkerEvent, listSessionIndexForWorker } from "./service";

export const internalRouter = Router();

internalRouter.post("/internal/worker/events", async (req, res) => {
  const secret = req.header("X-Worker-Secret");
  if (secret !== env.WORKER_SECRET) {
    return res.status(401).json({ error: "invalid_worker_secret" });
  }

  await ingestWorkerEvent(req.body);
  return res.status(202).json({ accepted: true });
});

internalRouter.get("/internal/worker/sessions-index", async (req, res) => {
  const secret = req.header("X-Worker-Secret");
  if (secret !== env.WORKER_SECRET) {
    return res.status(401).json({ error: "invalid_worker_secret" });
  }

  const items = await listSessionIndexForWorker();
  return res.status(200).json({ items });
});
