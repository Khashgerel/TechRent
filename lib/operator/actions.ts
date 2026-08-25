"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

/**
 * An operator marking themselves unavailable removes them from matching
 * immediately — the engine treats availability as a hard gate.
 */
export async function setAvailabilityAction(locale: string, available: boolean) {
  const session = await getSession();
  if (!session || session.role !== "OPERATOR") throw new Error("Not authorised");

  await db.operatorProfile.update({
    where: { userId: session.uid },
    data: { available },
  });

  revalidatePath(`/${locale}/operator`);
}
