// @ts-ignore
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const seedApiKey = process.env.SEED_API_KEY ?? "zyn_seed_local_dev_2026";
  const seedCompanyUsername = process.env.SEED_COMPANY_USERNAME ?? "demo";
  const seedCompanyPassword = process.env.SEED_COMPANY_PASSWORD ?? "admin123";
  const companyPasswordHash = await bcrypt.hash(seedCompanyPassword, 10);
  const company = await prisma.company.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {
      authUsername: seedCompanyUsername,
      authPasswordHash: companyPasswordHash
    },
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Demo Company",
      status: "active",
      authUsername: seedCompanyUsername,
      authPasswordHash: companyPasswordHash
    }
  });

  const keyHash = await bcrypt.hash(seedApiKey, 10);
  const existingKey = await prisma.apiKey.findFirst({
    where: {
      companyId: company.id,
      name: "Default Login Key",
      revokedAt: null
    }
  });

  const created = existingKey
    ? await prisma.apiKey.update({
        where: { id: existingKey.id },
        data: { keyHash, revokedAt: null }
      })
    : await prisma.apiKey.create({
        data: {
          companyId: company.id,
          name: "Default Login Key",
          keyHash
        }
      });

  await prisma.apiKey.updateMany({
    where: {
      companyId: company.id,
      name: "Default Login Key",
      id: { not: created.id }
    },
    data: {
      revokedAt: new Date()
    }
  });

  console.log("Seed completed");
  console.log(`Company ID: ${company.id}`);
  console.log(`ApiKey ID: ${created.id}`);
  console.log(`Login API key: ${seedApiKey}`);
  console.log(`Company username: ${seedCompanyUsername}`);
  console.log(`Company password: ${seedCompanyPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
