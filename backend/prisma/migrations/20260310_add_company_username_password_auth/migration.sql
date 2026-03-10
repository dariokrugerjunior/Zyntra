ALTER TABLE "Company"
ADD COLUMN "authUsername" TEXT,
ADD COLUMN "authPasswordHash" TEXT;

CREATE UNIQUE INDEX "Company_authUsername_key" ON "Company"("authUsername");
