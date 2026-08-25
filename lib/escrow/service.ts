import "server-only";

import { db } from "@/lib/db";
import { splitBookingAmount } from "@/lib/money";
import type { NotificationType, Role } from "@/lib/generated/prisma/enums";
import {
  canFire,
  EVENT_ACTOR,
  InvalidTransitionError,
  levelForPoints,
  planTransition,
  pointsForCompletion,
  type BookingAccounts,
  type BookingAmounts,
  type BookingEvent,
} from "./booking";
import { balanceOf, postTransaction } from "./ledger";

export class NotPermittedError extends Error {
  constructor(event: BookingEvent, role: Role) {
    super(`${role} may not ${event} this booking`);
    this.name = "NotPermittedError";
  }
}

async function systemAccounts() {
  const [escrow, revenue, external] = await Promise.all([
    db.account.findFirstOrThrow({ where: { kind: "ESCROW" } }),
    db.account.findFirstOrThrow({ where: { kind: "PLATFORM_REVENUE" } }),
    db.account.findFirstOrThrow({ where: { kind: "EXTERNAL" } }),
  ]);
  return { escrow, revenue, external };
}

async function walletFor(userId: string) {
  return db.account.findUniqueOrThrow({ where: { userId } });
}

/**
 * Turns an accepted offer into a booking and holds the deposit. This is the
 * moment the platform starts holding the client's money.
 */
export async function createBookingFromMatch(matchId: string, companyId: string) {
  const match = await db.match.findUniqueOrThrow({
    where: { id: matchId },
    include: {
      order: true,
      equipment: true,
      operator: { include: { user: true } },
    },
  });

  if (match.order.companyId !== companyId) throw new Error("Not found");
  if (!match.equipment) throw new Error("Match has no equipment");

  const existing = await db.booking.findUnique({ where: { matchId } });
  if (existing) return existing;

  const settings = await db.platformSettings.findUniqueOrThrow({
    where: { id: "singleton" },
  });

  const total = match.quotedAmount;
  const { commissionAmount, ownerPayout, operatorPayout } = splitBookingAmount(
    total,
    settings.commissionRate,
    settings.operatorShare,
    Boolean(match.operatorId),
  );
  const depositAmount = Math.round(total * settings.depositPercent);

  const amounts: BookingAmounts = {
    totalAmount: total,
    depositAmount,
    commissionAmount,
    ownerPayout,
    operatorPayout,
  };

  const { escrow, revenue, external } = await systemAccounts();
  const [companyWallet, ownerWallet] = await Promise.all([
    walletFor(companyId),
    walletFor(match.equipment.ownerId),
  ]);
  const operatorWallet = match.operator
    ? await walletFor(match.operator.userId)
    : null;

  const accounts: BookingAccounts = {
    company: companyWallet.id,
    owner: ownerWallet.id,
    operator: operatorWallet?.id ?? null,
    escrow: escrow.id,
    platformRevenue: revenue.id,
    external: external.id,
  };

  const companyBalance = await balanceOf(db, companyWallet.id);
  const plan = planTransition("CREATE", "PENDING", amounts, accounts, companyBalance);

  const booking = await db.$transaction(async (tx) => {
    const created = await tx.booking.create({
      data: {
        orderId: match.orderId,
        matchId: match.id,
        equipmentId: match.equipmentId,
        operatorId: match.operatorId,
        startDate: match.order.startDate,
        endDate: match.order.endDate,
        totalAmount: total,
        depositAmount,
        commissionRate: settings.commissionRate,
        commissionAmount,
        ownerPayout,
        operatorPayout,
        status: "PENDING",
      },
    });

    for (const transaction of plan.transactions) {
      await postTransaction(tx, {
        type: transaction.type,
        bookingId: created.id,
        memo: transaction.memo,
        entries: transaction.entries,
      });
    }

    await tx.order.update({
      where: { id: match.orderId },
      data: { status: "CONFIRMED" },
    });

    return created;
  });

  await notify(booking.id, ["OWNER", "OPERATOR"], "OFFER_ACCEPTED");

  return booking;
}

export type FireResult = { ok: true } | { ok: false; error: string };

/**
 * Advances a booking and posts whatever money the transition implies. The
 * ledger writes and the status change share one database transaction, so a
 * booking can never be left in a state its money doesn't match.
 */
export async function fireBookingEvent(
  bookingId: string,
  event: BookingEvent,
  actor: { id: string; role: Role },
): Promise<FireResult> {
  const booking = await db.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: {
      order: true,
      equipment: true,
      operator: { include: { user: true } },
    },
  });

  if (!EVENT_ACTOR[event].includes(actor.role as never)) {
    throw new NotPermittedError(event, actor.role);
  }

  // The actor must actually be a party to this booking.
  const isCompany = booking.order.companyId === actor.id;
  const isOwner = booking.equipment?.ownerId === actor.id;
  const isOperator = booking.operator?.userId === actor.id;
  if (!isCompany && !isOwner && !isOperator) throw new Error("Not found");

  if (!canFire(event, booking.status)) {
    throw new InvalidTransitionError(event, booking.status);
  }

  const amounts: BookingAmounts = {
    totalAmount: booking.totalAmount,
    depositAmount: booking.depositAmount,
    commissionAmount: booking.commissionAmount,
    ownerPayout: booking.ownerPayout,
    operatorPayout: booking.operatorPayout,
  };

  const { escrow, revenue, external } = await systemAccounts();
  const [companyWallet, ownerWallet] = await Promise.all([
    walletFor(booking.order.companyId),
    walletFor(booking.equipment!.ownerId),
  ]);
  const operatorWallet = booking.operator
    ? await walletFor(booking.operator.userId)
    : null;

  const accounts: BookingAccounts = {
    company: companyWallet.id,
    owner: ownerWallet.id,
    operator: operatorWallet?.id ?? null,
    escrow: escrow.id,
    platformRevenue: revenue.id,
    external: external.id,
  };

  const companyBalance = await balanceOf(db, companyWallet.id);
  const plan = planTransition(event, booking.status, amounts, accounts, companyBalance);

  const settings = await db.platformSettings.findUniqueOrThrow({
    where: { id: "singleton" },
  });

  await db.$transaction(async (tx) => {
    for (const transaction of plan.transactions) {
      await postTransaction(tx, {
        type: transaction.type,
        bookingId: booking.id,
        memo: transaction.memo,
        entries: transaction.entries,
      });
    }

    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: plan.to,
        ...(plan.timestampField ? { [plan.timestampField]: new Date() } : {}),
        ...(event === "VERIFY" ? { paidAt: new Date() } : {}),
      },
    });

    await tx.order.update({
      where: { id: booking.orderId },
      data: { status: orderStatusFor(plan.to) },
    });

    // Finishing a job is what moves an operator up the ladder.
    if (event === "VERIFY" && booking.operatorId) {
      const profile = await tx.operatorProfile.findUniqueOrThrow({
        where: { id: booking.operatorId },
      });

      const gained = pointsForCompletion(
        settings.pointsPerJob,
        settings.pointsPerRating,
        null,
      );
      const points = profile.points + gained;

      await tx.operatorProfile.update({
        where: { id: booking.operatorId },
        data: {
          points,
          jobsDone: { increment: 1 },
          level: levelForPoints(
            points,
            settings.levelUpIntermediate,
            settings.levelUpAdvanced,
          ),
        },
      });
    }
  });

  await notify(booking.id, audienceFor(event), notificationFor(event));

  return { ok: true };
}

function orderStatusFor(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "CONFIRMED" as const;
    case "IN_PROGRESS":
      return "IN_PROGRESS" as const;
    case "COMPLETED":
      return "COMPLETED" as const;
    case "PAID":
      return "PAID" as const;
    case "CANCELLED":
      return "CANCELLED" as const;
    default:
      return "MATCHED" as const;
  }
}

function audienceFor(event: BookingEvent): Role[] {
  switch (event) {
    case "CONFIRM":
      return ["COMPANY", "OPERATOR"];
    case "START":
      return ["COMPANY", "OWNER", "OPERATOR"];
    case "COMPLETE":
      return ["COMPANY"];
    case "VERIFY":
      return ["OWNER", "OPERATOR"];
    case "CANCEL":
      return ["COMPANY", "OWNER", "OPERATOR"];
    default:
      return [];
  }
}

function notificationFor(event: BookingEvent): NotificationType {
  switch (event) {
    case "CONFIRM":
      return "BOOKING_CONFIRMED";
    case "START":
      return "BOOKING_STARTED";
    case "COMPLETE":
      return "BOOKING_COMPLETED";
    case "VERIFY":
      return "PAYOUT_RELEASED";
    default:
      return "BOOKING_VERIFIED";
  }
}

/** Fans a booking event out to the parties who need to know about it. */
async function notify(bookingId: string, roles: Role[], type: NotificationType) {
  if (roles.length === 0) return;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      order: { include: { company: { include: { companyProfile: true } } } },
      equipment: true,
      operator: true,
    },
  });
  if (!booking) return;

  const payload = {
    orderTitle: booking.order.title,
    companyName:
      booking.order.company.companyProfile?.companyName ??
      booking.order.company.name,
    equipmentName: booking.equipment
      ? `${booking.equipment.make} ${booking.equipment.model}`
      : "",
    amount: booking.totalAmount,
  };

  const targets: { userId: string; link: string }[] = [];

  if (roles.includes("COMPANY")) {
    targets.push({
      userId: booking.order.companyId,
      link: `/company/progress/${booking.id}`,
    });
  }
  if (roles.includes("OWNER") && booking.equipment) {
    targets.push({
      userId: booking.equipment.ownerId,
      link: `/owner/bookings/${booking.id}`,
    });
  }
  if (roles.includes("OPERATOR") && booking.operator) {
    targets.push({
      userId: booking.operator.userId,
      link: `/operator/jobs/${booking.id}`,
    });
  }

  await db.notification.createMany({
    data: targets.map((target) => ({
      userId: target.userId,
      type,
      data: payload,
      link: target.link,
    })),
  });
}
