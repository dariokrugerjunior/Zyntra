import { Router } from "express";
import { env } from "../../config/env";
import { ingestWorkerEvent } from "./service";

export const internalRouter = Router();

internalRouter.post("/internal/worker/events", async (req, res) => {
  const secret = req.header("X-Worker-Secret");
  if (secret !== env.WORKER_SECRET) {
    return res.status(401).json({ error: "invalid_worker_secret" });
  }

  await ingestWorkerEvent(req.body);
  return res.status(202).json({ accepted: true });
});
