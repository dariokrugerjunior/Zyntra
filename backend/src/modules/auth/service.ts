import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../infra/db/prisma";
import { env } from "../../config/env";
import { HttpError } from "../../shared/errors/http-error";

export async function createApiKey(companyId: string, name: string) {
  const plainApiKey = `zyn_${randomBytes(24).toString("hex")}`;
  const keyHash = await bcrypt.hash(plainApiKey, 10);

  const key = await prisma.apiKey.create({
    data: {
      companyId,
      name,
      keyHash
    },
    select: { id: true, name: true, createdAt: true }
  });

  return { ...key, apiKey: plainApiKey };
}

export async function authenticateCredential(mode: "api-key" | "jwt", credential: string) {
  if (mode === "jwt") {
    try {
      const secret = env.JWT_SECRET;
      const payload = jwt.verify(credential, secret) as { companyId?: string };
      if (!payload.companyId) {
        throw new HttpError(401, "invalid_token");
      }

      return { companyId: payload.companyId, authType: "jwt" as const };
    } catch {
      throw new HttpError(401, "invalid_token");
    }
  }

  const keys = await prisma.apiKey.findMany({
    where: { revokedAt: null },
    select: { companyId: true, keyHash: true }
  });

  for (const stored of keys) {
    if (await bcrypt.compare(credential, stored.keyHash)) {
      return { companyId: stored.companyId, authType: "apiKey" as const };
    }
  }

  throw new HttpError(401, "invalid_api_key");
}
