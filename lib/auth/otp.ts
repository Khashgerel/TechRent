import "server-only";

import { createHash, randomInt } from "node:crypto";
import { db } from "@/lib/db";
// Defined in `./demo-gate`, which the demo password gate reads too, and which
// stays free of `server-only` so it can be unit tested. Re-exported below
// because this is where callers have always found it.
import { isDemoMode } from "./demo-gate";

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export { isDemoMode };

function hash(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export function normalizePhone(input: string) {
  return input.replace(/\D/g, "").slice(-8);
}

export async function issueOtp(phone: string) {
  const code = String(randomInt(1000, 10000));

  await db.otpCode.create({
    data: {
      phone,
      codeHash: hash(code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });

  // Returned only in demo mode; the caller surfaces it in the UI. With a real
  // SMS gateway this is where the send would happen and nothing would come back.
  return isDemoMode() ? code : null;
}

export type OtpResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "too_many_attempts" | "mismatch" };

export async function verifyOtp(phone: string, code: string): Promise<OtpResult> {
  const record = await db.otpCode.findFirst({
    where: { phone, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return { ok: false, reason: "not_found" };
  if (record.expiresAt < new Date()) return { ok: false, reason: "expired" };
  if (record.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: "too_many_attempts" };
  }

  if (record.codeHash !== hash(code)) {
    await db.otpCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "mismatch" };
  }

  await db.otpCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  return { ok: true };
}
