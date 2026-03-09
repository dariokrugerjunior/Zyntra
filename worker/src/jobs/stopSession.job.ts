import { z } from "zod";
import { stopSession } from "../engine/baileys.manager";

const schema = z.object({
  companyId: z.string().uuid(),
  sessionId: z.string().uuid()
});

export async function stopSessionJob(data: unknown) {
  const parsed = schema.parse(data);
  await stopSession(parsed.companyId, parsed.sessionId);
}
