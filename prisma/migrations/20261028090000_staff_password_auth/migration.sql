-- Staff sign-in. Both nullable: marketplace accounts never hold either, and a
-- staff account exists before `npm run admin:create` gives it a password, so
-- that no default password is ever written anywhere.
ALTER TABLE "User" ADD COLUMN "username" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Failed sign-in attempts, counted in the database because consecutive
-- requests on Vercel may land on different lambdas, where an in-process
-- counter would reset itself and throttle nothing.
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "firstFailed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastFailed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LoginAttempt_subject_key" ON "LoginAttempt"("subject");
CREATE INDEX "LoginAttempt_lockedUntil_idx" ON "LoginAttempt"("lockedUntil");
