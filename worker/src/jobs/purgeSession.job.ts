import { z } from "zod";
import { purgeSession } from "../engine/baileys.manager";

const schema = z.object({
  companyId: z.string().uuid(),
  sessionId: z.string().uuid()
});

export async function purgeSessionJob(data: unknown) {
  const parsed = schema.parse(data);
  await purgeSession(parsed.companyId, parsed.sessionId);
}
