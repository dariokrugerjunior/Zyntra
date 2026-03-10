import axios from "axios";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../../shared/utils/env";
import { logger } from "../../shared/logger/logger";

type SessionIndexItem = {
  companyId: string;
  sessionId: string;
};

type SessionIndexResponse = {
  items?: SessionIndexItem[];
};

export async function cleanupOrphanSessionStorage() {
  const response = await axios.get<SessionIndexResponse>(`${env.BACKEND_INTERNAL_URL}/internal/worker/sessions-index`, {
    timeout: 15000,
    headers: { "X-Worker-Secret": env.WORKER_SECRET }
  });

  const valid = new Set(
    (response.data.items ?? []).map((item) => `${item.companyId}:${item.sessionId}`)
  );

  const companiesRoot = path.join(env.BAILEYS_STORAGE_PATH, "companies");
  let removed = 0;
  let scanned = 0;

  const companyDirs = await safeReadDir(companiesRoot);
  for (const companyDir of companyDirs) {
    if (!companyDir.isDirectory()) continue;
    const companyId = companyDir.name;
    const sessionsDir = path.join(companiesRoot, companyId, "sessions");
    const sessionDirs = await safeReadDir(sessionsDir);

    for (const sessionDir of sessionDirs) {
      if (!sessionDir.isDirectory()) continue;
      scanned += 1;
      const sessionId = sessionDir.name;
      const key = `${companyId}:${sessionId}`;
      if (valid.has(key)) continue;

      const sessionPath = path.join(sessionsDir, sessionId);
      await fs.rm(sessionPath, { recursive: true, force: true });
      removed += 1;
    }

    // Keep tree tidy after deletions.
    await removeDirIfEmpty(sessionsDir);
    await removeDirIfEmpty(path.join(companiesRoot, companyId));
  }

  logger.info({ scanned, removed, root: companiesRoot }, "orphan session storage cleanup completed");
}

async function safeReadDir(dirPath: string) {
  try {
    return await fs.readdir(dirPath, { withFileTypes: true });
  } catch (error: any) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function removeDirIfEmpty(dirPath: string) {
  try {
    const entries = await fs.readdir(dirPath);
    if (entries.length === 0) {
      await fs.rmdir(dirPath);
    }
  } catch (error: any) {
    if (error?.code === "ENOENT") return;
    if (error?.code === "ENOTEMPTY") return;
    throw error;
  }
}
