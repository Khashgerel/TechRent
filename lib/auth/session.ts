import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/lib/generated/prisma/enums";

const COOKIE_NAME = "techrent_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type SessionPayload = {
  uid: string;
  /**
   * The role the visitor is currently looking at — their `activeRole`.
   *
   * Kept under the old name because that is what it has always meant to the
   * pages that read it: which dashboard am I in. What a visitor is *allowed*
   * to reach is `roles`, and that is what the guards check.
   */
  role: Role;
  /** Every role this account may act as. One person can hold several. */
  roles: Role[];
  name: string;
  phone: string | null;
  /**
   * Set only while a staff member is impersonating this account: who they
   * really are. Its presence is what the banner and the exit button key off,
   * and what every audit row about this session should name.
   */
  actor?: { uid: string; name: string };
};

/**
 * Builds the session payload from a user row — the one place that decides what
 * a session carries, so the phone, demo and social sign-in paths cannot drift.
 */
export function sessionFor(user: {
  id: string;
  activeRole: Role;
  roles: Role[];
  name: string;
  phone: string | null;
}): SessionPayload {
  return {
    uid: user.id,
    role: user.activeRole,
    roles: user.roles,
    name: user.name,
    phone: user.phone,
  };
}

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set — see .env.example");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(
  payload: SessionPayload,
  maxAgeSeconds: number = MAX_AGE_SECONDS,
) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    // The cookie and the token expire together, so clearing one cannot leave
    // the other usable.
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.uid !== "string") return null;

    const role = payload.role as Role;
    // Tokens signed before multi-role existed carry no `roles`. Treating the
    // active role as the only membership keeps those sessions working rather
    // than signing everyone out on deploy.
    const roles = Array.isArray(payload.roles)
      ? (payload.roles as Role[])
      : [role];

    return {
      uid: payload.uid,
      role,
      roles,
      name: payload.name as string,
      phone: (payload.phone as string | null) ?? null,
      ...(payload.actor
        ? { actor: payload.actor as { uid: string; name: string } }
        : {}),
    };
  } catch {
    return null;
  }
}

export async function createSession(
  payload: SessionPayload,
  maxAgeSeconds: number = MAX_AGE_SECONDS,
) {
  const token = await signSessionToken(payload, maxAgeSeconds);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** An impersonated session is short-lived: a forgotten tab is a staff-level hole. */
export const IMPERSONATION_MAX_AGE_SECONDS = 60 * 60;

export const SESSION_COOKIE_NAME = COOKIE_NAME;
