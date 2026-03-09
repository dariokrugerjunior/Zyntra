import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

const envFileCandidates = [
  process.env.ENV_FILE,
  process.env.NODE_ENV === "production" ? ".env.production" : ".env.local",
  ".env"
].filter((value): value is string => Boolean(value));

const envDirCandidates = [
  process.cwd(),
  resolve(__dirname, "../.."),
  resolve(__dirname, "../../..")
];

let loaded = false;
for (const envDir of envDirCandidates) {
  for (const envFile of envFileCandidates) {
    const envPath = resolve(envDir, envFile);
    if (existsSync(envPath)) {
      config({ path: envPath });
      loaded = true;
      break;
    }
  }
  if (loaded) break;
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  JWT_SECRET: z.string().min(1),
  WORKER_SECRET: z.string().min(1),
  LOG_LEVEL: z.string().default("info")
});

export const env = envSchema.parse(process.env);
