"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { coordinatesFor } from "@/lib/locations";
import {
  availabilityBlockSchema,
  equipmentSchema,
  type EquipmentInput,
} from "@/lib/validation/equipment";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

async function requireOwner() {
  const session = await getSession();
  if (!session || !session.roles.includes("OWNER")) {
    throw new Error("Not authorised");
  }
  return session;
}

/** Confirms the equipment belongs to the signed-in owner before any write. */
async function assertOwns(equipmentId: string, ownerId: string) {
  const equipment = await db.equipment.findUnique({
    where: { id: equipmentId },
    select: { ownerId: true },
  });
  if (!equipment || equipment.ownerId !== ownerId) {
    throw new Error("Not found");
  }
}

function toFieldErrors(error: {
  issues: { path: PropertyKey[]; message: string }[];
}) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

export async function saveEquipmentAction(
  locale: string,
  equipmentId: string | null,
  input: EquipmentInput,
): Promise<ActionResult> {
  const session = await requireOwner();

  const parsed = equipmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const data = parsed.data;
  const district = data.district || null;
  const { lat, lng } = coordinatesFor(data.aimag, district);

  const specs = Object.fromEntries(data.specs.map((s) => [s.name, s.value]));

  const payload = {
    category: data.category as never,
    make: data.make,
    model: data.model,
    year: data.year,
    hourlyRate: data.hourlyRate,
    dailyRate: data.dailyRate,
    monthlyRate: data.monthlyRate,
    aimag: data.aimag,
    district,
    lat,
    lng,
    description: data.description || null,
    withOperator: data.withOperator,
    status: data.status as never,
    photos: data.photos,
    specs,
  };

  let id = equipmentId;

  if (equipmentId) {
    await assertOwns(equipmentId, session.uid);
    await db.equipment.update({ where: { id: equipmentId }, data: payload });
  } else {
    const created = await db.equipment.create({
      data: { ...payload, ownerId: session.uid },
    });
    id = created.id;
  }

  revalidatePath(`/${locale}/owner`);
  revalidatePath(`/${locale}/owner/equipment`);
  if (id) revalidatePath(`/${locale}/owner/equipment/${id}`);

  return { ok: true, id: id ?? undefined };
}

export async function setEquipmentStatusAction(
  locale: string,
  equipmentId: string,
  status: "ACTIVE" | "MAINTENANCE" | "INACTIVE",
) {
  const session = await requireOwner();
  await assertOwns(equipmentId, session.uid);

  await db.equipment.update({
    where: { id: equipmentId },
    data: { status },
  });

  revalidatePath(`/${locale}/owner/equipment`);
  revalidatePath(`/${locale}/owner/equipment/${equipmentId}`);
}

export async function deleteEquipmentAction(locale: string, equipmentId: string) {
  const session = await requireOwner();
  await assertOwns(equipmentId, session.uid);

  // Equipment with booking history is retired rather than deleted, so the
  // ledger and reviews that reference it stay intact.
  const bookings = await db.booking.count({ where: { equipmentId } });

  if (bookings > 0) {
    await db.equipment.update({
      where: { id: equipmentId },
      data: { status: "INACTIVE" },
    });
  } else {
    await db.equipment.delete({ where: { id: equipmentId } });
  }

  revalidatePath(`/${locale}/owner/equipment`);
  redirect(`/${locale}/owner/equipment`);
}

export async function addAvailabilityBlockAction(
  locale: string,
  input: unknown,
): Promise<ActionResult> {
  const session = await requireOwner();

  const parsed = availabilityBlockSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  await assertOwns(parsed.data.equipmentId, session.uid);

  await db.availabilityBlock.create({
    data: {
      equipmentId: parsed.data.equipmentId,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      reason: parsed.data.reason || null,
    },
  });

  revalidatePath(`/${locale}/owner/calendar`);
  return { ok: true };
}

export async function removeAvailabilityBlockAction(
  locale: string,
  blockId: string,
) {
  const session = await requireOwner();

  const block = await db.availabilityBlock.findUnique({
    where: { id: blockId },
    include: { equipment: { select: { ownerId: true } } },
  });

  if (!block || block.equipment.ownerId !== session.uid) {
    throw new Error("Not found");
  }

  await db.availabilityBlock.delete({ where: { id: blockId } });
  revalidatePath(`/${locale}/owner/calendar`);
}
