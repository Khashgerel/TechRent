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

export async function signSessionToken(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
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
    };
  } catch {
    return null;
  }
}

export async function createSession(payload: SessionPayload) {
  const token = await signSessionToken(payload);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
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

export const SESSION_COOKIE_NAME = COOKIE_NAME;
