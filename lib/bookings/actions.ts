"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { fireBookingEvent } from "@/lib/escrow/service";
import { InvalidTransitionError, type BookingEvent } from "@/lib/escrow/booking";
import { NotPermittedError } from "@/lib/escrow/service";
import { reviewSchema, type ReviewInput } from "@/lib/validation/review";

export type BookingActionResult = { ok: true } | { ok: false; error: string };

/**
 * Single entry point for every lifecycle move. The service re-checks the actor
 * and the transition, so this layer only has to identify who is asking.
 */
export async function fireBookingEventAction(
  locale: string,
  bookingId: string,
  event: BookingEvent,
): Promise<BookingActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorised" };

  try {
    await fireBookingEvent(bookingId, event, {
      id: session.uid,
      role: session.role,
    });
  } catch (error) {
    if (error instanceof InvalidTransitionError) {
      return { ok: false, error: "invalidTransition" };
    }
    if (error instanceof NotPermittedError) {
      return { ok: false, error: "notPermitted" };
    }
    throw error;
  }

  for (const path of [
    `/${locale}/owner/bookings`,
    `/${locale}/owner`,
    `/${locale}/operator/jobs`,
    `/${locale}/operator`,
    `/${locale}/company/progress`,
    `/${locale}/company/progress/${bookingId}`,
    `/${locale}/notifications`,
  ]) {
    revalidatePath(path);
  }

  return { ok: true };
}

/**
 * Files a review and folds it into the subject's running average. Ratings are
 * stored denormalised because they're read on every listing card and computing
 * them per render would mean a query per card.
 */
export async function submitReviewAction(
  locale: string,
  input: ReviewInput,
): Promise<BookingActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorised" };

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const data = parsed.data;

  const booking = await db.booking.findUnique({
    where: { id: data.bookingId },
    include: { order: true, equipment: true, operator: true },
  });
  if (!booking) return { ok: false, error: "notFound" };

  // Only a party to the booking may review it, and only once it has settled.
  const isCompany = booking.order.companyId === session.uid;
  const isOwner = booking.equipment?.ownerId === session.uid;
  if (!isCompany && !isOwner) return { ok: false, error: "notPermitted" };
  if (booking.status !== "PAID") return { ok: false, error: "notSettled" };

  const existing = await db.review.findFirst({
    where: {
      bookingId: data.bookingId,
      authorId: session.uid,
      subjectType: data.subjectType as never,
    },
  });
  if (existing) return { ok: false, error: "alreadyReviewed" };

  await db.$transaction(async (tx) => {
    await tx.review.create({
      data: {
        bookingId: data.bookingId,
        authorId: session.uid,
        subjectType: data.subjectType as never,
        subjectId: data.subjectId,
        rating: data.rating,
        punctuality: data.punctuality ?? null,
        quality: data.quality ?? null,
        care: data.care ?? null,
        comment: data.comment || null,
      },
    });

    const aggregate = await tx.review.aggregate({
      where: { subjectType: data.subjectType as never, subjectId: data.subjectId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const ratingAvg = aggregate._avg.rating ?? 0;
    const ratingCount = aggregate._count.rating;

    if (data.subjectType === "EQUIPMENT") {
      await tx.equipment.update({
        where: { id: data.subjectId },
        data: { ratingAvg, ratingCount },
      });
    } else if (data.subjectType === "OPERATOR") {
      await tx.operatorProfile.update({
        where: { id: data.subjectId },
        data: { ratingAvg, ratingCount },
      });
    } else {
      await tx.companyProfile.update({
        where: { id: data.subjectId },
        data: { ratingAvg, ratingCount },
      });
    }

    // The person being reviewed should hear about it.
    const subjectUserId =
      data.subjectType === "OPERATOR"
        ? booking.operator?.userId
        : data.subjectType === "EQUIPMENT"
          ? booking.equipment?.ownerId
          : booking.order.companyId;

    if (subjectUserId) {
      await tx.notification.create({
        data: {
          userId: subjectUserId,
          type: "REVIEW_RECEIVED",
          data: { orderTitle: booking.order.title, rating: data.rating },
          link: `/notifications`,
        },
      });
    }
  });

  revalidatePath(`/${locale}/company/reviews`);
  revalidatePath(`/${locale}/company/progress/${data.bookingId}`);

  return { ok: true };
}

export async function markNotificationsReadAction(locale: string) {
  const session = await getSession();
  if (!session) return;

  await db.notification.updateMany({
    where: { userId: session.uid, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath(`/${locale}/notifications`);
}
