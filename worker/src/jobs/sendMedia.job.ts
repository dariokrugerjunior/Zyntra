import { z } from "zod";
import { emitMessageError, sendMedia } from "../engine/baileys.manager";
import { logger } from "../shared/logger/logger";

const MESSAGE_TTL_MS = 60_000;

const schema = z.object({
  companyId: z.string().uuid(),
  sessionId: z.string().uuid(),
  to: z.string(),
  base64: z.string(),
  mime: z.string(),
  fileName: z.string().optional(),
  caption: z.string().optional(),
  enqueuedAt: z.number().int().positive().optional()
});

export async function sendMediaJob(data: unknown) {
  const parsed = schema.parse(data);
  const ageMs = Date.now() - Number(parsed.enqueuedAt ?? 0);
  if (!parsed.enqueuedAt || ageMs > MESSAGE_TTL_MS) {
    logger.warn(
      { companyId: parsed.companyId, sessionId: parsed.sessionId, to: parsed.to, ageMs },
      "dropping stale media message job"
    );
    return;
  }

  try {
    await sendMedia(parsed.companyId, parsed.sessionId, parsed.to, parsed.base64, parsed.mime, parsed.fileName, parsed.caption);
  } catch (error) {
    await emitMessageError(parsed.companyId, parsed.sessionId, error);
    throw error;
  }
}
