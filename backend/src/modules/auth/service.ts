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

async function authenticateApiKey(credential: string) {
  const keys = await prisma.apiKey.findMany({
    where: { revokedAt: null },
    select: { companyId: true, keyHash: true, company: { select: { name: true } } }
  });

  for (const stored of keys) {
    if (await bcrypt.compare(credential, stored.keyHash)) {
      return {
        companyId: stored.companyId,
        companyName: stored.company.name,
        authType: "apiKey" as const
      };
    }
  }

  throw new HttpError(401, "invalid_api_key");
}

async function authenticateCompanyCredentials(username: string, password: string) {
  const company = await prisma.company.findFirst({
    where: {
      authUsername: username,
      status: "active"
    },
    select: {
      id: true,
      name: true,
      authPasswordHash: true
    }
  });

  if (!company?.authPasswordHash) {
    throw new HttpError(401, "invalid_company_credentials");
  }

  const valid = await bcrypt.compare(password, company.authPasswordHash);
  if (!valid) {
    throw new HttpError(401, "invalid_company_credentials");
  }

  const token = jwt.sign({ companyId: company.id }, env.JWT_SECRET, { expiresIn: "12h" });

  return {
    companyId: company.id,
    companyName: company.name,
    authType: "jwt" as const,
    token
  };
}

export async function authenticateCredential(
  input:
    | { mode: "api-key"; credential: string }
    | { mode: "company"; username: string; password: string }
) {
  if (input.mode === "api-key") {
    return authenticateApiKey(input.credential);
  }

  return authenticateCompanyCredentials(input.username, input.password);
}
