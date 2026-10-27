-- Social sign-in carries no phone number, so the column stops being required.
-- It stays unique, which keeps the phone + OTP path working for the accounts
-- that do have one.
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;

-- Email is how a returning social sign-in finds an existing account before any
-- provider id has been linked to it. Every seeded row holds NULL here and
-- Postgres allows any number of those, so nothing collides.
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- One account may now hold several roles. Written as a rename plus a backfill
-- rather than a drop and re-add, so no existing account loses its role.
ALTER TABLE "User" ADD COLUMN "roles" "Role"[];
UPDATE "User" SET "roles" = ARRAY["role"];
ALTER TABLE "User" RENAME COLUMN "role" TO "activeRole";
ALTER INDEX "User_role_idx" RENAME TO "User_activeRole_idx";

-- Social identities live in their own table so one person can sign in with
-- Google today and Facebook tomorrow and land on the same account.
CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE', 'FACEBOOK');

CREATE TABLE "OAuthAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OAuthAccount_provider_providerAccountId_key" ON "OAuthAccount"("provider", "providerAccountId");
CREATE INDEX "OAuthAccount_userId_idx" ON "OAuthAccount"("userId");

ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
