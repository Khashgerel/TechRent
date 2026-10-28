import "server-only";

import { redirect } from "next/navigation";
import type { Role } from "@/lib/generated/prisma/enums";
import { db } from "@/lib/db";
import { getSession, type SessionPayload } from "./session";

/**
 * Confirms the signed cookie *and* that the account still exists and is active.
 * The existence check matters because reseeding the demo database leaves valid
 * cookies pointing at deleted users — without it those sessions silently render
 * empty dashboards instead of asking the visitor to sign in again.
 */
export async function requireSession(locale: string): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const user = await db.user.findUnique({
    where: { id: session.uid },
    select: { id: true, activeRole: true, roles: true, suspendedAt: true },
  });

  if (!user || user.suspendedAt) redirect(`/logout?locale=${locale}`);

  // Roles can change under a live session; trust the database, not the token.
  return { ...session, role: user.activeRole, roles: user.roles };
}

/**
 * Guards an area of the app.
 *
 * This asks whether the visitor *holds* one of these roles, not whether it is
 * the one they happen to be looking at. Someone who owns machines, operates
 * them and places orders reaches all three areas without switching anything —
 * which is the whole point of an account holding several roles.
 */
export async function requireRole(
  locale: string,
  ...roles: Role[]
): Promise<SessionPayload> {
  const session = await requireSession(locale);
  if (!roles.some((role) => session.roles.includes(role))) {
    // Opening an area you don't hold yet is an interest in holding it, not a
    // mistake — so offer the role rather than bouncing back to the dashboard.
    // Staff are the exception: they are never offered a marketplace role.
    if (session.roles.includes("ADMIN")) {
      redirect(`/${locale}/${homeForRole(session.role)}`);
    }
    redirect(`/${locale}/account?want=${roles[0]}`);
  }
  return session;
}

/** The landing route each role sees after signing in. */
export function homeForRole(role: Role) {
  switch (role) {
    case "OWNER":
      return "owner";
    case "OPERATOR":
      return "operator";
    case "COMPANY":
      return "company";
    case "ADMIN":
      return "admin";
  }
}

export async function currentUser() {
  const session = await getSession();
  if (!session) return null;

  return db.user.findUnique({
    where: { id: session.uid },
    include: {
      ownerProfile: true,
      operatorProfile: true,
      companyProfile: true,
    },
  });
}

/**
 * The roles the database says this account holds, for server actions.
 *
 * Server components go through `requireSession`, which already re-reads roles
 * from the database. Actions cannot redirect, so they used to read
 * `session.roles` straight off the cookie — which is a snapshot from sign-in
 * time. Grant someone a role and their pages would work while every action
 * refused, until they signed in again. Revoking one had the mirror problem.
 *
 * Returns null when there is no usable session, so callers can refuse.
 */
export async function actorWithRoles() {
  const session = await getSession();
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.uid },
    select: { roles: true, suspendedAt: true },
  });
  if (!user || user.suspendedAt) return null;

  return { ...session, roles: user.roles };
}

/** `actorWithRoles`, refusing unless one of `roles` is held. */
export async function requireActorRole(...roles: Role[]) {
  const actor = await actorWithRoles();
  if (!actor || !roles.some((role) => actor.roles.includes(role))) {
    throw new Error("Not authorised");
  }
  return actor;
}
