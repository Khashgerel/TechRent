import { distanceKm, type LatLng } from "../geo";
import { quoteFor } from "../equipment";

/**
 * The matching engine scores candidates against an order and explains itself.
 *
 * Two things are deliberate here. First, availability and category are *hard
 * gates*, not weighted factors — a machine that is the wrong type or already
 * booked is not a 60% match, it is not a match. Second, every score carries the
 * numbers that produced it, so the UI can say "12km away, certified on this
 * class, available your whole window" instead of showing a bare percentage.
 *
 * Nothing here touches the database, which is what makes it testable.
 */

export type DateRange = { start: Date; end: Date };

export type OrderCriteria = {
  category: string;
  location: LatLng;
  range: DateRange;
  needsOperator: boolean;
  budgetMin?: number | null;
  budgetMax?: number | null;
};

export type EquipmentCandidate = {
  id: string;
  ownerId: string;
  category: string;
  make: string;
  model: string;
  status: string;
  location: LatLng;
  dailyRate: number;
  monthlyRate: number;
  withOperator: boolean;
  ratingAvg: number;
  ratingCount: number;
  /** Ranges the machine is already committed to (bookings and owner blocks). */
  busy: DateRange[];
};

export type OperatorCandidate = {
  id: string;
  userId: string;
  name: string;
  skills: string[];
  location: LatLng;
  dailyRate: number;
  ratingAvg: number;
  ratingCount: number;
  level: string;
  jobsDone: number;
  available: boolean;
  busy: DateRange[];
};

export type FactorKey = "distance" | "price" | "rating" | "operator" | "readiness";

export type Factor = {
  key: FactorKey;
  /** 0–100 before weighting. */
  score: number;
  weight: number;
  /** Numbers behind the score, for the UI to render a human explanation. */
  detail: Record<string, number | string | boolean>;
};

export type MatchResult = {
  equipment: EquipmentCandidate;
  operator: OperatorCandidate | null;
  score: number;
  distanceKm: number;
  quotedAmount: number;
  days: number;
  factors: Factor[];
  breakdown: Record<FactorKey, number>;
};

export type Rejection = {
  equipmentId: string;
  reason: "category" | "status" | "unavailable" | "no_operator";
};

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Distance decays smoothly rather than stepping. Mongolia is big: 25km inside
 * Ulaanbaatar should still score well, while 600km across aimags should not.
 */
const DISTANCE_SCALE_KM = 220;

const WEIGHTS_WITH_OPERATOR: Record<FactorKey, number> = {
  distance: 30,
  price: 25,
  rating: 18,
  operator: 17,
  readiness: 10,
};

/** With no operator to judge, that weight moves to price and rating. */
const WEIGHTS_EQUIPMENT_ONLY: Record<FactorKey, number> = {
  distance: 30,
  price: 33,
  rating: 27,
  operator: 0,
  readiness: 10,
};

export function daysInRange(range: DateRange) {
  return Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / DAY_MS));
}

export function overlaps(a: DateRange, b: DateRange) {
  return a.start < b.end && b.start < a.end;
}

function isFree(busy: DateRange[], range: DateRange) {
  return !busy.some((b) => overlaps(b, range));
}

/**
 * Ratings are shrunk toward the platform mean so a single 5-star review doesn't
 * outrank a machine with fifty reviews averaging 4.7.
 */
export function bayesianRating(avg: number, count: number, prior = 4.2, weight = 5) {
  if (count <= 0) return prior;
  return (avg * count + prior * weight) / (count + weight);
}

function scoreDistance(km: number) {
  return Math.round(100 * Math.exp(-km / DISTANCE_SCALE_KM));
}

function scorePrice(quote: number, min?: number | null, max?: number | null) {
  // No stated budget means price can't count for or against a candidate.
  if (max == null || max <= 0) return { score: 70, overBudget: false, ratio: 1 };

  if (quote <= max) {
    // Comfortably inside budget scores full marks; right at the ceiling is fine
    // but not remarkable.
    const headroom = (max - quote) / max;
    return {
      score: Math.round(85 + Math.min(15, headroom * 60)),
      overBudget: false,
      ratio: quote / max,
    };
  }

  const over = (quote - max) / max;
  return {
    score: Math.max(0, Math.round(85 - over * 220)),
    overBudget: true,
    ratio: quote / max,
  };
}

function scoreRating(avg: number, count: number) {
  const adjusted = bayesianRating(avg, count);
  return Math.round(((adjusted - 1) / 4) * 100);
}

function scoreOperator(operator: OperatorCandidate, category: string) {
  const certified = operator.skills.includes(category);
  const levelBonus =
    operator.level === "ADVANCED" ? 100 : operator.level === "INTERMEDIATE" ? 75 : 50;
  const experience = Math.min(100, operator.jobsDone * 2);
  const rating = scoreRating(operator.ratingAvg, operator.ratingCount);

  const score = Math.round(
    (certified ? 100 : 0) * 0.35 + levelBonus * 0.25 + rating * 0.25 + experience * 0.15,
  );

  return { score, certified, levelBonus, experience };
}

/**
 * How much slack sits around the requested window. A machine free for weeks
 * either side is a safer booking than one free by exactly a day, because the
 * job overrunning is the normal case on a construction site.
 */
function scoreReadiness(candidate: EquipmentCandidate, range: DateRange) {
  const padded: DateRange = {
    start: new Date(range.start.getTime() - 7 * DAY_MS),
    end: new Date(range.end.getTime() + 7 * DAY_MS),
  };

  const conflicts = candidate.busy.filter((b) => overlaps(b, padded)).length;
  const score = conflicts === 0 ? 100 : conflicts === 1 ? 65 : 35;
  return { score, conflicts };
}

export type MatchOptions = {
  /** Cap on how far away a candidate can be before it's dropped entirely. */
  maxDistanceKm?: number;
  limit?: number;
};

/** Assembles one scored match for a given equipment/operator pairing. */
function buildMatch(
  order: OrderCriteria,
  candidate: EquipmentCandidate,
  operator: OperatorCandidate | null,
  km: number,
  days: number,
  weights: Record<FactorKey, number>,
): MatchResult {
  const operatorFactor = operator
    ? scoreOperator(operator, order.category)
    : { score: 0, certified: false, levelBonus: 0, experience: 0 };

  const equipmentCost = quoteFor(candidate, days);
  const operatorCost = operator ? operator.dailyRate * days : 0;
  const quotedAmount = equipmentCost + operatorCost;

  const price = scorePrice(quotedAmount, order.budgetMin, order.budgetMax);
  const readiness = scoreReadiness(candidate, order.range);

  const factors: Factor[] = [
    {
      key: "distance",
      score: scoreDistance(km),
      weight: weights.distance,
      detail: { km: Math.round(km * 10) / 10 },
    },
    {
      key: "price",
      score: price.score,
      weight: weights.price,
      detail: {
        quote: quotedAmount,
        overBudget: price.overBudget,
        percentOfBudget: Math.round(price.ratio * 100),
      },
    },
    {
      key: "rating",
      score: scoreRating(candidate.ratingAvg, candidate.ratingCount),
      weight: weights.rating,
      detail: {
        rating: Math.round(candidate.ratingAvg * 10) / 10,
        reviews: candidate.ratingCount,
      },
    },
    {
      key: "operator",
      score: operatorFactor.score,
      weight: weights.operator,
      detail: {
        certified: operatorFactor.certified,
        jobsDone: operator?.jobsDone ?? 0,
        level: operator?.level ?? "",
      },
    },
    {
      key: "readiness",
      score: readiness.score,
      weight: weights.readiness,
      detail: { conflicts: readiness.conflicts },
    },
  ];

  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const score = Math.round(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0) / totalWeight,
  );

  const breakdown = Object.fromEntries(
    factors.map((f) => [f.key, f.score]),
  ) as Record<FactorKey, number>;

  return {
    equipment: candidate,
    operator,
    score,
    distanceKm: Math.round(km * 10) / 10,
    quotedAmount,
    days,
    factors,
    breakdown,
  };
}

export function matchOrder(
  order: OrderCriteria,
  equipment: EquipmentCandidate[],
  operators: OperatorCandidate[],
  options: MatchOptions = {},
): { matches: MatchResult[]; rejected: Rejection[] } {
  const { maxDistanceKm = Infinity, limit = 20 } = options;
  const days = daysInRange(order.range);
  const weights = order.needsOperator
    ? WEIGHTS_WITH_OPERATOR
    : WEIGHTS_EQUIPMENT_ONLY;

  const rejected: Rejection[] = [];

  // Operators eligible for this order at all, best first. Shared across every
  // machine, since certification is about the category rather than the machine.
  const eligibleOperators = order.needsOperator
    ? operators
        .filter(
          (op) =>
            op.available &&
            op.skills.includes(order.category) &&
            isFree(op.busy, order.range),
        )
        .sort((a, b) => {
          const aScore =
            scoreOperator(a, order.category).score -
            Math.min(15, distanceKm(order.location, a.location) / 40);
          const bScore =
            scoreOperator(b, order.category).score -
            Math.min(15, distanceKm(order.location, b.location) / 40);
          return bScore - aScore;
        })
    : [];

  const viable: { candidate: EquipmentCandidate; km: number }[] = [];

  for (const candidate of equipment) {
    if (candidate.category !== order.category) {
      rejected.push({ equipmentId: candidate.id, reason: "category" });
      continue;
    }
    if (candidate.status !== "ACTIVE") {
      rejected.push({ equipmentId: candidate.id, reason: "status" });
      continue;
    }
    if (!isFree(candidate.busy, order.range)) {
      rejected.push({ equipmentId: candidate.id, reason: "unavailable" });
      continue;
    }
    if (order.needsOperator && eligibleOperators.length === 0) {
      rejected.push({ equipmentId: candidate.id, reason: "no_operator" });
      continue;
    }

    const km = distanceKm(order.location, candidate.location);
    if (km > maxDistanceKm) {
      rejected.push({ equipmentId: candidate.id, reason: "unavailable" });
      continue;
    }

    viable.push({ candidate, km });
  }

  // Rank on the best crew each machine could get, then hand out operators in
  // that order. Proposing the same person on every offer would give the client
  // four options with no real choice of crew — and only one can be accepted
  // anyway, so distinct pairings are strictly more useful.
  const provisional = viable
    .map(({ candidate, km }) =>
      buildMatch(order, candidate, eligibleOperators[0] ?? null, km, days, weights),
    )
    .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm);

  const used = new Set<string>();
  const matches = provisional.map((provisionalMatch) => {
    if (!order.needsOperator) return provisionalMatch;

    const free = eligibleOperators.find((op) => !used.has(op.id));
    // Once every operator is spoken for, fall back to the best available so a
    // machine still gets an offer rather than disappearing.
    const chosen = free ?? eligibleOperators[0];
    if (chosen) used.add(chosen.id);

    const km = distanceKm(order.location, provisionalMatch.equipment.location);
    return buildMatch(order, provisionalMatch.equipment, chosen ?? null, km, days, weights);
  });

  matches.sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm);

  return { matches: matches.slice(0, limit), rejected };
}
