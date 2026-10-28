"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import {
  createSession,
  sessionFor,
  IMPERSONATION_MAX_AGE_SECONDS,
} from "@/lib/auth/session";
import { homeForRole } from "@/lib/auth/guards";

/**
 * Signing in as someone else, from the admin console.
 *
 * This replaced the public persona picker: the seeded demo accounts have no
 * email and no linked identity, so this is the only way to reach them — which
 * is exactly why it is behind a password and leaves a trail.
 *
 * The session it issues is the target's own, plus an `actor` naming the staff
 * member. Nothing downstream needs to special-case it, so an impersonated
 * session cannot accidentally be *more* capable than the real one.
 */

export type ImpersonationResult = { error: "notStaff" | "notFound" | "staffTarget" };

export async function startImpersonationAction(targetUserId: string) {
  const session = await getSession();

  // Only real staff, and never from inside an impersonated session — otherwise
  // the trail of who did what breaks after the first hop.
  if (!session || !session.roles.includes("ADMIN") || session.actor) {
    return { error: "notStaff" as const };
  }

  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      activeRole: true,
      roles: true,
      name: true,
      phone: true,
      locale: true,
      suspendedAt: true,
    },
  });

  if (!target || target.suspendedAt) return { error: "notFound" as const };

  // Staff impersonating staff would be a way to borrow another admin's
  // identity, which no audit trail can untangle afterwards.
  if (target.roles.includes("ADMIN")) return { error: "staffTarget" as const };

  const actor = await db.user.findUniqueOrThrow({
    where: { id: session.uid },
    select: { id: true, name: true },
  });

  await db.auditLog.create({
    data: {
      actorId: actor.id,
      action: "user.impersonate",
      targetType: "User",
      targetId: target.id,
      meta: { targetName: target.name, targetRoles: target.roles },
    },
  });

  await createSession(
    { ...sessionFor(target), actor: { uid: actor.id, name: actor.name } },
    IMPERSONATION_MAX_AGE_SECONDS,
  );

  redirect(`/${target.locale}/${homeForRole(target.activeRole)}`);
}

/** Hands the staff member back their own session. */
export async function stopImpersonationAction() {
  const session = await getSession();
  if (!session?.actor) redirect("/admin/login");

  const staff = await db.user.findUnique({
    where: { id: session.actor.uid },
    select: {
      id: true,
      activeRole: true,
      roles: true,
      name: true,
      phone: true,
      locale: true,
      suspendedAt: true,
    },
  });

  // The staff account was suspended or deleted while impersonating: end the
  // session rather than hand back something that should no longer work.
  if (!staff || staff.suspendedAt || !staff.roles.includes("ADMIN")) {
    redirect("/logout");
  }

  await createSession(sessionFor(staff));
  redirect(`/${staff.locale}/admin/users`);
}
