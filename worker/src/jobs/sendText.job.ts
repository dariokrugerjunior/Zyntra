import { z } from "zod";
import { emitMessageError, sendText } from "../engine/baileys.manager";

const schema = z.object({
  companyId: z.string().uuid(),
  sessionId: z.string().uuid(),
  to: z.string(),
  text: z.string()
});

export async function sendTextJob(data: unknown) {
  const parsed = schema.parse(data);
  try {
    await sendText(parsed.companyId, parsed.sessionId, parsed.to, parsed.text);
  } catch (error) {
    await emitMessageError(parsed.companyId, parsed.sessionId, error);
    throw error;
  }
}
