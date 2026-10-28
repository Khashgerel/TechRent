"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/guards";
import {
  operatorProfileSchema,
  ownerProfileSchema,
  type OperatorProfileInput,
  type OwnerProfileInput,
} from "@/lib/validation/profile";
import type { EquipmentCategory, Role } from "@/lib/generated/prisma/enums";

/**
 * Taking on a role.
 *
 * Signing in asks for nothing, so an account starts as a client and earns the
 * other roles by filling that section's form. Saving grants the role straight
 * away rather than queueing for approval — the person keeps moving, and the
 * account stays unverified, which is what holds their first machine in review
 * until an admin looks at it.
 *
 * Mirrors `lib/company/profile-actions.ts`, which already does this for the
 * client role.
 */

export type RoleActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function toFieldErrors(error: {
  issues: { path: PropertyKey[]; message: string }[];
}) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/** Adds a role without disturbing the ones already held. */
function withRole(roles: Role[], role: Role) {
  return roles.includes(role) ? roles : [...roles, role];
}

export async function becomeOwnerAction(
  locale: string,
  input: OwnerProfileInput,
): Promise<RoleActionResult> {
  const session = await requireSession(locale);

  const parsed = ownerProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  // Staff accounts hold ADMIN and nothing else.
  if (session.roles.includes("ADMIN")) return { ok: false, error: "staff" };

  const data = parsed.data;

  await db.$transaction(async (tx) => {
    await tx.ownerProfile.upsert({
      where: { userId: session.uid },
      create: {
        userId: session.uid,
        companyName: data.companyName,
        regNumber: data.regNumber || null,
        aimag: data.aimag,
        district: data.district || null,
        bio: data.bio || null,
      },
      update: {
        companyName: data.companyName,
        regNumber: data.regNumber || null,
        aimag: data.aimag,
        district: data.district || null,
        bio: data.bio || null,
      },
    });

    const user = await tx.user.findUniqueOrThrow({
      where: { id: session.uid },
      select: { roles: true },
    });

    await tx.user.update({
      where: { id: session.uid },
      data: { roles: withRole(user.roles, "OWNER") },
    });
  });

  revalidatePath(`/${locale}/account`);
  revalidatePath(`/${locale}/owner`);
  return { ok: true };
}

export async function becomeOperatorAction(
  locale: string,
  input: OperatorProfileInput,
): Promise<RoleActionResult> {
  const session = await requireSession(locale);

  const parsed = operatorProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  if (session.roles.includes("ADMIN")) return { ok: false, error: "staff" };

  const data = parsed.data;
  const skills = data.skills as EquipmentCategory[];

  await db.$transaction(async (tx) => {
    await tx.operatorProfile.upsert({
      where: { userId: session.uid },
      create: {
        userId: session.uid,
        yearsExperience: data.yearsExperience,
        skills,
        aimag: data.aimag,
        district: data.district || null,
        dailyRate: data.dailyRate,
        available: data.available,
        bio: data.bio || null,
      },
      update: {
        yearsExperience: data.yearsExperience,
        skills,
        aimag: data.aimag,
        district: data.district || null,
        dailyRate: data.dailyRate,
        available: data.available,
        bio: data.bio || null,
      },
    });

    const user = await tx.user.findUniqueOrThrow({
      where: { id: session.uid },
      select: { roles: true },
    });

    await tx.user.update({
      where: { id: session.uid },
      data: { roles: withRole(user.roles, "OPERATOR") },
    });
  });

  revalidatePath(`/${locale}/account`);
  revalidatePath(`/${locale}/operator`);
  return { ok: true };
}
