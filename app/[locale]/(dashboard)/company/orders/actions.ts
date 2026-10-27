"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { coordinatesFor } from "@/lib/locations";
import { generateMatches } from "@/lib/matching/service";
import { createBookingFromMatch } from "@/lib/escrow/service";
import { orderSchema, type OrderInput } from "@/lib/validation/order";

export type OrderActionResult =
  | { ok: true; id: string; matchCount: number }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

async function requireCompany() {
  const session = await getSession();
  // Membership, not the role being viewed: an owner who also places orders
  // holds COMPANY while looking at their equipment dashboard.
  if (!session || !session.roles.includes("COMPANY")) {
    throw new Error("Not authorised");
  }
  return session;
}

async function assertOwnsOrder(orderId: string, companyId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { companyId: true },
  });
  if (!order || order.companyId !== companyId) throw new Error("Not found");
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

export async function createOrderAction(
  locale: string,
  input: OrderInput,
): Promise<OrderActionResult> {
  const session = await requireCompany();

  // The page redirects to the profile form before showing the order form; this
  // is the same rule enforced where it actually counts.
  const profile = await db.companyProfile.findUnique({
    where: { userId: session.uid },
    select: { id: true },
  });
  if (!profile) return { ok: false, error: "profileRequired" };

  const parsed = orderSchema.safeParse(input);
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

  const order = await db.order.create({
    data: {
      companyId: session.uid,
      title: data.title,
      description: data.description || null,
      category: data.category as never,
      status: "OPEN",
      startDate: data.startDate,
      endDate: data.endDate,
      aimag: data.aimag,
      district,
      lat,
      lng,
      needsOperator: data.needsOperator,
      budgetMin: data.budgetMin || null,
      budgetMax: data.budgetMax || null,
    },
  });

  // Scoring runs immediately so the company lands on a page with real offers
  // rather than an empty "we'll be in touch" state.
  const matches = await generateMatches(order.id);

  revalidatePath(`/${locale}/company/orders`);

  return { ok: true, id: order.id, matchCount: matches.length };
}

export async function rerunMatchingAction(locale: string, orderId: string) {
  const session = await requireCompany();
  await assertOwnsOrder(orderId, session.uid);

  await generateMatches(orderId);

  revalidatePath(`/${locale}/company/orders/${orderId}`);
}

export async function declineMatchAction(locale: string, matchId: string) {
  const session = await requireCompany();

  const match = await db.match.findUnique({
    where: { id: matchId },
    include: { order: { select: { companyId: true, id: true } } },
  });
  if (!match || match.order.companyId !== session.uid) throw new Error("Not found");

  await db.match.update({
    where: { id: matchId },
    data: { status: "DECLINED", respondedAt: new Date() },
  });

  revalidatePath(`/${locale}/company/orders/${match.order.id}`);
}

/**
 * Records the company's choice and turns it into a booking, which is the point
 * at which the deposit moves into escrow.
 */
export async function acceptMatchAction(locale: string, matchId: string) {
  const session = await requireCompany();

  const match = await db.match.findUnique({
    where: { id: matchId },
    include: { order: { select: { companyId: true, id: true } } },
  });
  if (!match || match.order.companyId !== session.uid) throw new Error("Not found");

  await db.$transaction([
    db.match.update({
      where: { id: matchId },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    }),
    // Everything else the company was considering is off the table.
    db.match.updateMany({
      where: { orderId: match.order.id, id: { not: matchId }, status: "SUGGESTED" },
      data: { status: "DECLINED", respondedAt: new Date() },
    }),
  ]);

  const booking = await createBookingFromMatch(matchId, session.uid);

  revalidatePath(`/${locale}/company/orders/${match.order.id}`);
  revalidatePath(`/${locale}/company/progress`);

  redirect(`/${locale}/company/progress/${booking.id}`);
}
