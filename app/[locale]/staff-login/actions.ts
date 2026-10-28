"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, sessionFor } from "@/lib/auth/session";
import { clientIpFrom, signInStaff } from "@/lib/auth/staff-login";

export type StaffLoginState = { error?: "invalid" | "locked" };

export async function staffLoginAction(
  _prev: StaffLoginState,
  formData: FormData,
): Promise<StaffLoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!username || !password) return { error: "invalid" };

  const ip = clientIpFrom(await headers());
  const result = await signInStaff(username, password, ip);

  if (!result.ok) {
    return { error: result.reason === "locked" ? "locked" : "invalid" };
  }

  const user = await db.user.findUniqueOrThrow({
    where: { id: result.userId },
    select: {
      id: true,
      activeRole: true,
      roles: true,
      name: true,
      phone: true,
    },
  });

  await createSession(sessionFor(user));
  redirect(`/${result.locale}/admin`);
}
