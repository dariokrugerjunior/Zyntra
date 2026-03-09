-- Session auto-reply configuration per WhatsApp session
CREATE TYPE "AutoReplyProvider" AS ENUM ('mock', 'openai');

CREATE TABLE "SessionAutoReplyConfig" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "sessionId" UUID NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "promptText" TEXT,
  "provider" "AutoReplyProvider" NOT NULL DEFAULT 'mock',
  "apiToken" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SessionAutoReplyConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SessionAutoReplyConfig_sessionId_key" ON "SessionAutoReplyConfig"("sessionId");
CREATE INDEX "SessionAutoReplyConfig_companyId_sessionId_idx" ON "SessionAutoReplyConfig"("companyId", "sessionId");

ALTER TABLE "SessionAutoReplyConfig"
ADD CONSTRAINT "SessionAutoReplyConfig_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionAutoReplyConfig"
ADD CONSTRAINT "SessionAutoReplyConfig_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "WaSession"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
