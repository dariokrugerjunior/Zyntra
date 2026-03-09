import { z } from "zod";
import { startSession } from "../engine/baileys.manager";

const schema = z.object({
  companyId: z.string().uuid(),
  sessionId: z.string().uuid()
});

export async function startSessionJob(data: unknown) {
  const parsed = schema.parse(data);
  await startSession(parsed.companyId, parsed.sessionId);
}
