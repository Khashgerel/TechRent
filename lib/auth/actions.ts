"use server";

import { redirect } from "next/navigation";
import { destroySession } from "./session";

export async function signOutAction(locale: string) {
  await destroySession();
  redirect(`/${locale}/login`);
}
