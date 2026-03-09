import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../infra/db/prisma";
import { createApiKey } from "./service";

const createSchema = z.object({ name: z.string().min(2).max(120) });

export const authRouter = Router();

authRouter.post("/api-keys", async (req, res) => {
  const { companyId } = req.context!;
  const body = createSchema.parse(req.body);
  const created = await createApiKey(companyId, body.name);
  return res.status(201).json(created);
});

authRouter.get("/api-keys", async (req, res) => {
  const { companyId } = req.context!;
  const keys = await prisma.apiKey.findMany({
    where: { companyId, revokedAt: null },
    select: { id: true, name: true, createdAt: true, revokedAt: true },
    orderBy: { createdAt: "desc" }
  });
  return res.json(keys);
});

authRouter.delete("/api-keys/:id", async (req, res) => {
  const { companyId } = req.context!;
  const id = z.string().uuid().parse(req.params.id);

  const updated = await prisma.apiKey.updateMany({
    where: { id, companyId, revokedAt: null },
    data: { revokedAt: new Date() }
  });

  if (!updated.count) {
    return res.status(404).json({ error: "api_key_not_found" });
  }

  return res.status(204).send();
});
