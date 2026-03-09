import { Router } from "express";
import { z } from "zod";
import { createSession, getSessionById, listSessions, startSession, stopSession } from "./service";

export const sessionsRouter = Router();

sessionsRouter.post("/sessions", async (req, res) => {
  const session = await createSession(req.context!.companyId, req.body);
  return res.status(201).json(session);
});

sessionsRouter.get("/sessions", async (req, res) => {
  const items = await listSessions(req.context!.companyId);
  return res.json(items);
});

sessionsRouter.get("/sessions/:id", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const session = await getSessionById(req.context!.companyId, id);
  return res.json(session);
});

sessionsRouter.post("/sessions/:id/start", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const result = await startSession(req.context!.companyId, id);
  return res.status(202).json(result);
});

sessionsRouter.post("/sessions/:id/stop", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const result = await stopSession(req.context!.companyId, id);
  return res.status(202).json(result);
});

sessionsRouter.get("/sessions/:id/qr", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const session = await getSessionById(req.context!.companyId, id);
  return res.json({ sessionId: session.id, status: session.status, qr: session.latestQr ?? null });
});

sessionsRouter.get("/sessions/:id/status", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const session = await getSessionById(req.context!.companyId, id);
  return res.json({ sessionId: session.id, status: session.status, phoneNumber: session.phoneNumber ?? null });
});
