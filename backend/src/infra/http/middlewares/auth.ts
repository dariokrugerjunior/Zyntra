import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "../../../config/env";
import { prisma } from "../../db/prisma";

function getBearerToken(authHeader?: string) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim();
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === "/health") {
    return next();
  }

  const apiKey = req.header("X-API-Key");
  const bearerToken = getBearerToken(req.header("Authorization"));

  if (!apiKey && !bearerToken) {
    return res.status(401).json({ error: "unauthorized" });
  }

  if (bearerToken) {
    try {
      const payload = jwt.verify(bearerToken, env.JWT_SECRET) as { companyId?: string };
      if (!payload.companyId) {
        return res.status(401).json({ error: "invalid_token" });
      }

      req.context = { companyId: payload.companyId, authType: "jwt" };
      return next();
    } catch {
      return res.status(401).json({ error: "invalid_token" });
    }
  }

  const keys = await prisma.apiKey.findMany({
    where: { revokedAt: null },
    select: { id: true, companyId: true, keyHash: true }
  });

  for (const stored of keys) {
    if (await bcrypt.compare(apiKey!, stored.keyHash)) {
      req.context = { companyId: stored.companyId, authType: "apiKey" };
      return next();
    }
  }

  return res.status(401).json({ error: "invalid_api_key" });
}
