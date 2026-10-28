"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActorRole } from "@/lib/auth/guards";

/**
 * An operator marking themselves unavailable removes them from matching
 * immediately — the engine treats availability as a hard gate.
 */
export async function setAvailabilityAction(locale: string, available: boolean) {
  // Roles from the database, not the cookie: see `requireActorRole`.
  const session = await requireActorRole("OPERATOR");

  await db.operatorProfile.update({
    where: { userId: session.uid },
    data: { available },
  });

  revalidatePath(`/${locale}/operator`);
}
