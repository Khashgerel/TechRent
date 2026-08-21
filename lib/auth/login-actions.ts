"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { homeForRole } from "./guards";
import { issueOtp, isDemoMode, normalizePhone, verifyOtp } from "./otp";
import { createSession } from "./session";

const DEMO_OTP_COOKIE = "techrent_demo_otp";

export type AuthState = { error?: string };

/**
 * Issues a code for a registered phone number and moves to the verify step.
 * In demo mode the plaintext code is parked in a short-lived cookie so the
 * verify screen can display it — the database only ever holds the hash.
 */
export async function requestCodeAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
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

  await createSession({
    uid: user.id,
    role: user.role,
    name: user.name,
    phone: user.phone,
  });

  const store = await cookies();
  store.delete(DEMO_OTP_COOKIE);

  redirect(`/${locale}/${homeForRole(user.role)}`);
}

/** One-click sign-in for the demo personas. Only available in demo mode. */
export async function demoLoginAction(locale: string, userId: string) {
  if (!isDemoMode()) redirect(`/${locale}/login`);

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) redirect(`/${locale}/demo`);

  await createSession({
    uid: user.id,
    role: user.role,
    name: user.name,
    phone: user.phone,
  });

  redirect(`/${locale}/${homeForRole(user.role)}`);
}

export async function readDemoOtp() {
  const store = await cookies();
  return store.get(DEMO_OTP_COOKIE)?.value ?? null;
}
