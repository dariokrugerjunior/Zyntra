import { z } from "zod";
import { emitMessageError, sendText } from "../engine/baileys.manager";
import { logger } from "../shared/logger/logger";

const MESSAGE_TTL_MS = 60_000;

const schema = z.object({
  companyId: z.string().uuid(),
  sessionId: z.string().uuid(),
  to: z.string(),
  text: z.string(),
  enqueuedAt: z.number().int().positive().optional()
});

export async function sendTextJob(data: unknown) {
  const parsed = schema.parse(data);
  const ageMs = Date.now() - Number(parsed.enqueuedAt ?? 0);
  if (!parsed.enqueuedAt || ageMs > MESSAGE_TTL_MS) {
    logger.warn(
      { companyId: parsed.companyId, sessionId: parsed.sessionId, to: parsed.to, ageMs },
      "dropping stale text message job"
    );
    return;
  }

  try {
    await sendText(parsed.companyId, parsed.sessionId, parsed.to, parsed.text);
  } catch (error) {
    await emitMessageError(parsed.companyId, parsed.sessionId, error);
    throw error;
  }
}
