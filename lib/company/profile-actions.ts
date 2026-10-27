"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/guards";
import {
  companyProfileSchema,
  type CompanyProfileInput,
} from "@/lib/validation/profile";

export type ProfileActionResult =
  | { ok: true }
  | { ok: false; error: "validation" | "phoneTaken"; fieldErrors?: Record<string, string> };

function toFieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Saves the client details and makes sure the account can actually act as one.
 *
 * A social sign-in already starts as a client, but filling this in from an
 * account that doesn't yet hold the role adds it rather than refusing — which
 * is what lets an owner or operator start ordering work without a second
 * sign-up.
 */
export async function saveCompanyProfileAction(
  locale: string,
  input: CompanyProfileInput,
): Promise<ProfileActionResult> {
  const session = await requireSession(locale);

  const parsed = companyProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fieldErrors: toFieldErrors(parsed.error) };
  }

  const data = parsed.data;

  // The phone is unique across accounts, so a clash has to be reported rather
  // than thrown — someone may be typing a number that already signed up.
  const clash = await db.user.findFirst({
    where: { phone: data.phone, NOT: { id: session.uid } },
    select: { id: true },
  });
  if (clash) {
    return { ok: false, error: "phoneTaken", fieldErrors: { phone: "phoneTaken" } };
  }

  await db.$transaction(async (tx) => {
    await tx.companyProfile.upsert({
      where: { userId: session.uid },
      create: {
        userId: session.uid,
        companyName: data.companyName,
        regNumber: data.regNumber || null,
        industry: data.industry || null,
        aimag: data.aimag,
        district: data.district || null,
      },
      update: {
        companyName: data.companyName,
        regNumber: data.regNumber || null,
        industry: data.industry || null,
        aimag: data.aimag,
        district: data.district || null,
      },
    });

    const user = await tx.user.findUniqueOrThrow({
      where: { id: session.uid },
      select: { roles: true, name: true },
    });

    await tx.user.update({
      where: { id: session.uid },
      data: {
        name: data.contactName,
        phone: data.phone,
        roles: user.roles.includes("COMPANY")
          ? user.roles
          : [...user.roles, "COMPANY"],
      },
    });
  });

  revalidatePath(`/${locale}/company`);
  return { ok: true };
}
