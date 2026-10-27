import "server-only";

import { db } from "@/lib/db";
import { availableEvents, EVENT_ACTOR, type BookingEvent } from "@/lib/escrow/booking";
import type { Role } from "@/lib/generated/prisma/enums";

/**
 * Loads a booking along with everything the detail page needs, and works out
 * which lifecycle moves this particular viewer is allowed to make.
 */
export async function getBookingFor(
  bookingId: string,
  viewer: { id: string; role: Role },
) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      order: { include: { company: { include: { companyProfile: true } } } },
      equipment: { include: { owner: { include: { ownerProfile: true } } } },
      operator: { include: { user: true } },
      reviews: { include: { author: { select: { id: true, name: true } } } },
    },
  });

  if (!booking) return null;

  // Capacities on *this* booking, which is what decides the buttons — mirroring
  // `fireBookingEvent`, so the UI never offers a move the service would refuse.
  const isCompany = booking.order.companyId === viewer.id;
  const isOwner = booking.equipment?.ownerId === viewer.id;
  const isOperator = booking.operator?.userId === viewer.id;

  const capacities: ("COMPANY" | "OWNER" | "OPERATOR")[] = [];
  if (isCompany) capacities.push("COMPANY");
  if (isOwner) capacities.push("OWNER");
  if (isOperator) capacities.push("OPERATOR");
  if (capacities.length === 0) return null;

  const events = availableEvents(booking.status).filter((event: BookingEvent) =>
    EVENT_ACTOR[event].some((allowed) => capacities.includes(allowed)),
  );

  // What this viewer still owes a review on, once the booking has settled.
  const pendingReviews: {
    subjectType: "OPERATOR" | "EQUIPMENT" | "COMPANY";
    subjectId: string;
  }[] = [];

  if (booking.status === "PAID") {
    const alreadyReviewed = new Set(
      booking.reviews
        .filter((r) => r.authorId === viewer.id)
        .map((r) => r.subjectType),
    );

    if (isCompany) {
      if (booking.equipment && !alreadyReviewed.has("EQUIPMENT")) {
        pendingReviews.push({
          subjectType: "EQUIPMENT",
          subjectId: booking.equipment.id,
        });
      }
      if (booking.operator && !alreadyReviewed.has("OPERATOR")) {
        pendingReviews.push({
          subjectType: "OPERATOR",
          subjectId: booking.operator.id,
        });
      }
    }

    if (isOwner) {
      const companyProfile = booking.order.company.companyProfile;
      if (companyProfile && !alreadyReviewed.has("COMPANY")) {
        pendingReviews.push({
          subjectType: "COMPANY",
          subjectId: companyProfile.id,
        });
      }
    }
  }

  return { booking, events, pendingReviews, isCompany, isOwner, isOperator };
}

export type BookingDetail = NonNullable<Awaited<ReturnType<typeof getBookingFor>>>;

export async function getCompanyBookings(companyId: string) {
  return db.booking.findMany({
    where: { order: { companyId } },
    include: {
      order: true,
      equipment: true,
      operator: { include: { user: true } },
    },
    orderBy: { startDate: "desc" },
  });
}

export async function getOperatorProfile(userId: string) {
  return db.operatorProfile.findUnique({
    where: { userId },
    include: { user: true },
  });
}

export async function getOperatorJobs(userId: string) {
  const profile = await db.operatorProfile.findUnique({ where: { userId } });
  if (!profile) return [];

  return db.booking.findMany({
    where: { operatorId: profile.id },
    include: {
      order: { include: { company: { include: { companyProfile: true } } } },
      equipment: true,
    },
    orderBy: { startDate: "desc" },
  });
}

export async function getOperatorIncome(userId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const wallet = await db.account.findUnique({ where: { userId } });
  if (!wallet) {
    return {
      available: 0,
      pending: 0,
      monthIncome: 0,
      lifetimeIncome: 0,
      transactions: [],
    };
  }

  const entries = await db.ledgerEntry.findMany({
    where: { accountId: wallet.id },
    include: {
      transaction: {
        include: {
          booking: {
            include: {
              equipment: true,
              order: {
                include: { company: { include: { companyProfile: true } } },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const available = entries.reduce((sum, e) => sum + e.amount, 0);
  const credits = entries.filter((e) => e.amount > 0);
  const lifetimeIncome = credits.reduce((sum, e) => sum + e.amount, 0);
  const monthIncome = credits
    .filter((e) => e.createdAt >= monthStart)
    .reduce((sum, e) => sum + e.amount, 0);

  const profile = await db.operatorProfile.findUnique({ where: { userId } });
  const inFlight = profile
    ? await db.booking.findMany({
        where: {
          operatorId: profile.id,
          status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] },
        },
        select: { operatorPayout: true },
      })
    : [];

  return {
    available,
    pending: inFlight.reduce((sum, b) => sum + b.operatorPayout, 0),
    monthIncome,
    lifetimeIncome,
    transactions: entries.slice(0, 40),
  };
}

export async function getNotifications(userId: string) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
}

export async function getReviewsFor(userId: string, role: Role) {
  const given = await db.review.findMany({
    where: { authorId: userId },
    include: { booking: { include: { order: true, equipment: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  // What people wrote about this viewer depends on which side they're on.
  let subjectIds: string[] = [];
  let subjectType: "OPERATOR" | "EQUIPMENT" | "COMPANY" = "COMPANY";

  if (role === "COMPANY") {
    const profile = await db.companyProfile.findUnique({ where: { userId } });
    subjectIds = profile ? [profile.id] : [];
    subjectType = "COMPANY";
  } else if (role === "OPERATOR") {
    const profile = await db.operatorProfile.findUnique({ where: { userId } });
    subjectIds = profile ? [profile.id] : [];
    subjectType = "OPERATOR";
  } else {
    const equipment = await db.equipment.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    subjectIds = equipment.map((e) => e.id);
    subjectType = "EQUIPMENT";
  }

  const received = subjectIds.length
    ? await db.review.findMany({
        where: { subjectType, subjectId: { in: subjectIds } },
        include: {
          author: { select: { name: true } },
          booking: { include: { order: true, equipment: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      })
    : [];

  return { given, received };
}
