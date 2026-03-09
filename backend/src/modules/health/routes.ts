import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  return res.status(200).json({ status: "ok" });
});
