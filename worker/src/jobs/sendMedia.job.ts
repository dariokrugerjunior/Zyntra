import { z } from "zod";
import { emitMessageError, sendMedia } from "../engine/baileys.manager";

const schema = z.object({
  companyId: z.string().uuid(),
  sessionId: z.string().uuid(),
  to: z.string(),
  base64: z.string(),
  mime: z.string(),
  fileName: z.string().optional(),
  caption: z.string().optional()
});

export async function sendMediaJob(data: unknown) {
  const parsed = schema.parse(data);
  try {
    await sendMedia(parsed.companyId, parsed.sessionId, parsed.to, parsed.base64, parsed.mime, parsed.fileName, parsed.caption);
  } catch (error) {
    await emitMessageError(parsed.companyId, parsed.sessionId, error);
    throw error;
  }
}
