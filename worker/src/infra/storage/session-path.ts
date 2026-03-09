import path from "node:path";
import fs from "node:fs/promises";
import { env } from "../../shared/utils/env";

export async function getSessionStoragePath(companyId: string, sessionId: string) {
  const sessionPath = path.join(env.BAILEYS_STORAGE_PATH, "companies", companyId, "sessions", sessionId);
  await fs.mkdir(sessionPath, { recursive: true });
  return sessionPath;
}

export function getSessionStoragePathUnsafe(companyId: string, sessionId: string) {
  return path.join(env.BAILEYS_STORAGE_PATH, "companies", companyId, "sessions", sessionId);
}
