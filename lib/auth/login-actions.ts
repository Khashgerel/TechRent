"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { homeForRole } from "./guards";
import {
  checkDemoPassword,
  demoGateEnabled,
  phoneLoginBlocked,
} from "./demo-gate";
import { issueOtp, isDemoMode, normalizePhone, verifyOtp } from "./otp";
import { createSession, sessionFor } from "./session";

const DEMO_OTP_COOKIE = "techrent_demo_otp";

export type AuthState = { error?: string };
export type DemoState = { error?: string };

/**
 * Issues a code for a registered phone number and moves to the verify step.
 * In demo mode the plaintext code is parked in a short-lived cookie so the
 * verify screen can display it — the database only ever holds the hash.
 */
export async function requestCodeAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  // The demo password is the only way in while it is set; see `./demo-gate`.
  if (phoneLoginBlocked()) return { error: "phoneLoginDisabled" };

  const locale = String(formData.get("locale") ?? "mn");
  const phone = normalizePhone(String(formData.get("phone") ?? ""));

  if (phone.length !== 8) return { error: "invalidPhone" };

  const user = await db.user.findUnique({ where: { phone } });
  if (!user) return { error: "notRegistered" };
  if (user.suspendedAt) return { error: "suspended" };

  const code = await issueOtp(phone);

  if (code) {
    const store = await cookies();
    store.set(DEMO_OTP_COOKIE, code, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 300,
    });
  }

  redirect(`/${locale}/verify?phone=${phone}`);
}

export async function verifyCodeAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  // Guarded here as well, so a code issued before the gate went up is useless.
  if (phoneLoginBlocked()) return { error: "phoneLoginDisabled" };

  const locale = String(formData.get("locale") ?? "mn");
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const code = String(formData.get("code") ?? "").trim();

  const result = await verifyOtp(phone, code);
  if (!result.ok) {
    const map = {
      not_found: "notFound",
      expired: "expired",
      mismatch: "mismatch",
      too_many_attempts: "tooManyAttempts",
    } as const;
    return { error: map[result.reason] };
  }

  const user = await db.user.findUnique({ where: { phone } });
  if (!user) return { error: "notRegistered" };
  if (user.suspendedAt) return { error: "suspended" };

  await createSession(sessionFor(user));

  const store = await cookies();
  store.delete(DEMO_OTP_COOKIE);

  redirect(`/${locale}/${homeForRole(user.activeRole)}`);
}

/**
 * Signs in as one of the seeded personas.
 *
 * When `DEMO_PASSWORD` is set the password is checked before the persona is
 * even looked up, so a wrong guess tells the caller nothing about which
 * accounts exist.
 */
export async function demoLoginAction(
  locale: string,
  _prev: DemoState,
  formData: FormData,
): Promise<DemoState> {
  if (!isDemoMode()) redirect(`/${locale}/login`);

  const password = String(formData.get("password") ?? "");
  if (demoGateEnabled() && !checkDemoPassword(password)) {
    return { error: "wrongPassword" };
  }

  const userId = String(formData.get("userId") ?? "");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "noPersona" };

  await createSession(sessionFor(user));

  redirect(`/${locale}/${homeForRole(user.activeRole)}`);
}

export async function readDemoOtp() {
  const store = await cookies();
  return store.get(DEMO_OTP_COOKIE)?.value ?? null;
}
