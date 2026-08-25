import "server-only";

import { db } from "@/lib/db";
import { coordinatesFor } from "@/lib/locations";
import {
  matchOrder,
  type DateRange,
  type EquipmentCandidate,
  type MatchResult,
  type OperatorCandidate,
} from "./engine";

/**
 * Bridges the pure engine to the database: loads candidates, runs the scoring,
 * and (optionally) persists the results as Match rows the company can act on.
 */

/** Everything that makes a machine or operator unavailable, in one list. */
function toBusyRanges(
  bookings: { startDate: Date; endDate: Date }[],
  blocks: { startDate: Date; endDate: Date }[] = [],
): DateRange[] {
  return [...bookings, ...blocks].map((b) => ({
    start: b.startDate,
    end: b.endDate,
  }));
}

const BLOCKING_BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
] as const;

export async function loadCandidates(category: string) {
  const equipment = await db.equipment.findMany({
    where: { category: category as never, status: "ACTIVE" },
    include: {
      bookings: {
        where: { status: { in: [...BLOCKING_BOOKING_STATUSES] } },
        select: { startDate: true, endDate: true },
      },
      availability: { select: { startDate: true, endDate: true } },
    },
  });

  const operators = await db.operatorProfile.findMany({
    where: { available: true, skills: { has: category as never } },
    include: {
      user: { select: { id: true, name: true } },
      bookings: {
        where: { status: { in: [...BLOCKING_BOOKING_STATUSES] } },
        select: { startDate: true, endDate: true },
      },
    },
  });

  const equipmentCandidates: EquipmentCandidate[] = equipment.map((e) => ({
    id: e.id,
    ownerId: e.ownerId,
    category: e.category,
    make: e.make,
    model: e.model,
    status: e.status,
    location: { lat: e.lat, lng: e.lng },
    dailyRate: e.dailyRate,
    monthlyRate: e.monthlyRate,
    withOperator: e.withOperator,
    ratingAvg: e.ratingAvg,
    ratingCount: e.ratingCount,
    busy: toBusyRanges(e.bookings, e.availability),
  }));

  const operatorCandidates: OperatorCandidate[] = operators.map((o) => ({
    id: o.id,
    userId: o.userId,
    name: o.user.name,
    skills: o.skills,
    // Operators carry a place, not coordinates — resolve through the shared list.
    location: coordinatesFor(o.aimag, o.district),
    dailyRate: o.dailyRate,
    ratingAvg: o.ratingAvg,
    ratingCount: o.ratingCount,
    level: o.level,
    jobsDone: o.jobsDone,
    available: o.available,
    busy: toBusyRanges(o.bookings),
  }));

  return { equipmentCandidates, operatorCandidates };
}

export type MatchOutcome = {
  matches: MatchResult[];
  /** Why candidates were dropped, so an empty result can explain itself. */
  rejectedBy: Record<string, number>;
  /** Machines of the right category that exist at all, gates aside. */
  categoryTotal: number;
};

export async function runMatching(orderId: string): Promise<MatchResult[]> {
  return (await runMatchingDetailed(orderId)).matches;
}

export async function runMatchingDetailed(orderId: string): Promise<MatchOutcome> {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });

  const { equipmentCandidates, operatorCandidates } = await loadCandidates(
    order.category,
  );

  const { matches, rejected } = matchOrder(
    {
      category: order.category,
      location: { lat: order.lat, lng: order.lng },
      range: { start: order.startDate, end: order.endDate },
      needsOperator: order.needsOperator,
      budgetMin: order.budgetMin,
      budgetMax: order.budgetMax,
    },
    equipmentCandidates,
    operatorCandidates,
    { limit: 12 },
  );

  const rejectedBy: Record<string, number> = {};
  for (const r of rejected) {
    rejectedBy[r.reason] = (rejectedBy[r.reason] ?? 0) + 1;
  }

  return { matches, rejectedBy, categoryTotal: equipmentCandidates.length };
}

/**
 * Replaces any previous suggestions for the order with a freshly scored set.
 * Offers the company has already acted on are left alone.
 */
export async function generateMatches(orderId: string) {
  const matches = await runMatching(orderId);

  await db.match.deleteMany({
    where: { orderId, status: "SUGGESTED" },
  });

  if (matches.length === 0) return [];

  await db.match.createMany({
    data: matches.map((m) => ({
      orderId,
      equipmentId: m.equipment.id,
      operatorId: m.operator?.id ?? null,
      score: m.score,
      breakdown: {
        factors: m.factors,
        quotedAmount: m.quotedAmount,
        days: m.days,
      },
      distanceKm: m.distanceKm,
      quotedAmount: m.quotedAmount,
      status: "SUGGESTED" as const,
    })),
  });

  await db.order.update({
    where: { id: orderId },
    data: { status: "MATCHED" },
  });

  return matches;
}
