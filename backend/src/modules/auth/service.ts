import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../../infra/db/prisma";

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
