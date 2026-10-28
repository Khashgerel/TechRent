import "server-only";

import { db } from "@/lib/db";
import { verifyPassword } from "./password";
import {
  checkAttempt,
  recordFailure,
  subjectsFor,
  type AttemptState,
} from "./throttle";

/**
 * Staff sign-in: the database half of the throttle, plus the password check.
 *
 * Every failure mode returns the same `invalid` result. Distinguishing "no such
 * username" from "wrong password" would turn this page into a way to discover
 * which staff accounts exist, and a locked-out attacker learning they are
 * locked out tells them their guessing is working.
 */

export type StaffLoginResult =
  | { ok: true; userId: string; locale: string }
  | { ok: false; reason: "invalid" }
  | { ok: false; reason: "locked"; retryAfterMs: number };

async function statesFor(subjects: string[]) {
  const rows = await db.loginAttempt.findMany({
    where: { subject: { in: subjects } },
  });
  return new Map(rows.map((row) => [row.subject, row as AttemptState]));
}

async function clear(subjects: string[]) {
  await db.loginAttempt.deleteMany({ where: { subject: { in: subjects } } });
}

async function penalise(subjects: string[], now: Date) {
  const states = await statesFor(subjects);

  for (const subject of subjects) {
    const next = recordFailure(states.get(subject) ?? null, now);
    await db.loginAttempt.upsert({
      where: { subject },
      create: { subject, ...next },
      update: next,
    });
  }
}

export async function signInStaff(
  username: string,
  password: string,
  ip: string | null,
): Promise<StaffLoginResult> {
  const now = new Date();
  const trimmed = username.trim();
  const subjects = subjectsFor(trimmed, ip);

  // Checked before the password is even looked at, so a locked-out subject
  // costs nothing to refuse and cannot keep guessing.
  const states = await statesFor(subjects);
  for (const subject of subjects) {
    const verdict = checkAttempt(states.get(subject) ?? null, now);
    if (!verdict.allowed) {
      return { ok: false, reason: "locked", retryAfterMs: verdict.retryAfterMs };
    }
  }

  const user = await db.user.findUnique({
    where: { username: trimmed.toLowerCase() },
    select: {
      id: true,
      passwordHash: true,
      roles: true,
      suspendedAt: true,
      locale: true,
    },
  });

  // `verifyPassword` returns false for a null hash, so an account that has not
  // been given a password yet simply cannot sign in.
  const passwordOk = await verifyPassword(password, user?.passwordHash ?? null);

  // Staff sign-in grants a staff session and nothing else: an account that is
  // not staff is refused here even with the right password.
  const isStaff = user?.roles.includes("ADMIN") ?? false;

  if (!user || !passwordOk || !isStaff || user.suspendedAt) {
    await penalise(subjects, now);
    return { ok: false, reason: "invalid" };
  }

  await clear(subjects);
  return { ok: true, userId: user.id, locale: user.locale };
}

/** The client address, as far as the platform will tell us. */
export function clientIpFrom(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim() || null;
  return headers.get("x-real-ip");
}
