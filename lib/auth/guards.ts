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
    select: { id: true, role: true, suspendedAt: true },
  });

  if (!user || user.suspendedAt) redirect(`/logout?locale=${locale}`);

  // The role can change under a live session; trust the database, not the token.
  return { ...session, role: user.role };
}

export async function requireRole(
  locale: string,
  ...roles: Role[]
): Promise<SessionPayload> {
  const session = await requireSession(locale);
  if (!roles.includes(session.role)) {
    redirect(`/${locale}/${homeForRole(session.role)}`);
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
