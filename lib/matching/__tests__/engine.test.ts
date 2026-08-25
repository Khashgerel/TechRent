import { describe, expect, it } from "vitest";
import {
  bayesianRating,
  matchOrder,
  overlaps,
  type EquipmentCandidate,
  type OperatorCandidate,
  type OrderCriteria,
} from "../engine";

const UB = { lat: 47.9187, lng: 106.9177 };
const DARKHAN = { lat: 49.4867, lng: 105.9228 };

const RANGE = {
  start: new Date("2026-09-01"),
  end: new Date("2026-09-11"),
};

function equipment(over: Partial<EquipmentCandidate> = {}): EquipmentCandidate {
  return {
    id: "eq1",
    ownerId: "owner1",
    category: "EXCAVATOR",
    make: "Caterpillar",
    model: "CAT 320",
    status: "ACTIVE",
    location: UB,
    dailyRate: 600_000,
    monthlyRate: 5_000_000,
    withOperator: true,
    ratingAvg: 4.5,
    ratingCount: 20,
    busy: [],
    ...over,
  };
}

function operator(over: Partial<OperatorCandidate> = {}): OperatorCandidate {
  return {
    id: "op1",
    userId: "u1",
    name: "Ганзориг",
    skills: ["EXCAVATOR"],
    location: UB,
    dailyRate: 150_000,
    ratingAvg: 4.7,
    ratingCount: 30,
    level: "ADVANCED",
    jobsDone: 40,
    available: true,
    busy: [],
    ...over,
  };
}

function order(over: Partial<OrderCriteria> = {}): OrderCriteria {
  return {
    category: "EXCAVATOR",
    location: UB,
    range: RANGE,
    needsOperator: false,
    budgetMin: null,
    budgetMax: null,
    ...over,
  };
}

describe("hard gates", () => {
  it("drops equipment of the wrong category", () => {
    const { matches, rejected } = matchOrder(
      order(),
      [equipment({ category: "CRANE" })],
      [],
    );

    expect(matches).toHaveLength(0);
    expect(rejected[0]).toEqual({ equipmentId: "eq1", reason: "category" });
  });

  it("drops equipment that isn't active", () => {
    const { matches, rejected } = matchOrder(
      order(),
      [equipment({ status: "MAINTENANCE" })],
      [],
    );

    expect(matches).toHaveLength(0);
    expect(rejected[0].reason).toBe("status");
  });

  it("drops equipment already booked across the window", () => {
    const { matches, rejected } = matchOrder(
      order(),
      [
        equipment({
          busy: [{ start: new Date("2026-09-05"), end: new Date("2026-09-08") }],
        }),
      ],
      [],
    );

    expect(matches).toHaveLength(0);
    expect(rejected[0].reason).toBe("unavailable");
  });

  it("keeps equipment whose booking ends before the window starts", () => {
    const { matches } = matchOrder(
      order(),
      [
        equipment({
          busy: [{ start: new Date("2026-08-01"), end: new Date("2026-08-30") }],
        }),
      ],
      [],
    );

    expect(matches).toHaveLength(1);
  });

  it("drops equipment when an operator is required and none is eligible", () => {
    const { matches, rejected } = matchOrder(
      order({ needsOperator: true }),
      [equipment()],
      [operator({ skills: ["CRANE"] })],
    );

    expect(matches).toHaveLength(0);
    expect(rejected[0].reason).toBe("no_operator");
  });

  it("ignores operators who are busy for the window", () => {
    const { matches } = matchOrder(
      order({ needsOperator: true }),
      [equipment()],
      [operator({ busy: [RANGE] })],
    );

    expect(matches).toHaveLength(0);
  });
});

describe("ranking", () => {
  it("puts the nearer machine first when nothing else differs", () => {
    const { matches } = matchOrder(
      order(),
      [
        equipment({ id: "far", location: DARKHAN }),
        equipment({ id: "near", location: UB }),
      ],
      [],
    );

    expect(matches.map((m) => m.equipment.id)).toEqual(["near", "far"]);
    expect(matches[0].score).toBeGreaterThan(matches[1].score);
  });

  it("ranks a machine inside budget above one that blows through it", () => {
    const { matches } = matchOrder(
      order({ budgetMax: 7_000_000 }),
      [
        equipment({ id: "pricey", dailyRate: 1_500_000, monthlyRate: 40_000_000 }),
        equipment({ id: "fair", dailyRate: 600_000, monthlyRate: 5_000_000 }),
      ],
      [],
    );

    expect(matches[0].equipment.id).toBe("fair");
  });

  it("does not let one glowing review outrank a long track record", () => {
    const { matches } = matchOrder(
      order(),
      [
        equipment({ id: "unproven", ratingAvg: 5, ratingCount: 1 }),
        equipment({ id: "proven", ratingAvg: 4.8, ratingCount: 50 }),
      ],
      [],
    );

    expect(matches[0].equipment.id).toBe("proven");
  });

  it("prefers a machine with clear space around the window", () => {
    const tightlyPacked = equipment({
      id: "tight",
      busy: [
        { start: new Date("2026-08-28"), end: new Date("2026-08-31") },
        { start: new Date("2026-09-12"), end: new Date("2026-09-20") },
      ],
    });

    const { matches } = matchOrder(
      order(),
      [tightlyPacked, equipment({ id: "clear" })],
      [],
    );

    expect(matches[0].equipment.id).toBe("clear");
  });
});

describe("quotes", () => {
  it("adds the operator's day rate to the equipment cost", () => {
    const { matches } = matchOrder(
      order({ needsOperator: true }),
      [equipment()],
      [operator({ dailyRate: 150_000 })],
    );

    // 10 days: 10 × 600,000 equipment + 10 × 150,000 operator.
    expect(matches[0].days).toBe(10);
    expect(matches[0].quotedAmount).toBe(7_500_000);
  });

  it("uses the monthly rate once a booking runs a month or longer", () => {
    const longRange = {
      start: new Date("2026-09-01"),
      end: new Date("2026-10-31"),
    };

    const { matches } = matchOrder(
      order({ range: longRange }),
      [equipment({ dailyRate: 600_000, monthlyRate: 5_000_000 })],
      [],
    );

    // 60 days at the monthly-implied rate (5,000,000 / 30), not the day rate.
    expect(matches[0].quotedAmount).toBe(60 * Math.round(5_000_000 / 30));
    expect(matches[0].quotedAmount).toBeLessThan(60 * 600_000);
  });
});

describe("explainability", () => {
  it("returns every factor with the numbers behind it", () => {
    const { matches } = matchOrder(
      order({ needsOperator: true, budgetMax: 8_000_000 }),
      [equipment()],
      [operator()],
    );

    const keys = matches[0].factors.map((f) => f.key);
    expect(keys).toEqual([
      "distance",
      "price",
      "rating",
      "operator",
      "readiness",
    ]);

    const distance = matches[0].factors.find((f) => f.key === "distance")!;
    expect(distance.detail.km).toBe(0);

    const price = matches[0].factors.find((f) => f.key === "price")!;
    expect(price.detail.overBudget).toBe(false);
    expect(price.detail.quote).toBe(7_500_000);

    const op = matches[0].factors.find((f) => f.key === "operator")!;
    expect(op.detail.certified).toBe(true);
  });

  it("drops the operator factor to zero weight when none is needed", () => {
    const { matches } = matchOrder(order(), [equipment()], []);

    const op = matches[0].factors.find((f) => f.key === "operator")!;
    expect(op.weight).toBe(0);

    const total = matches[0].factors.reduce((s, f) => s + f.weight, 0);
    expect(total).toBe(100);
  });

  it("keeps the score inside 0–100", () => {
    const { matches } = matchOrder(
      order({ budgetMax: 1000 }),
      [equipment({ location: DARKHAN, ratingAvg: 1, ratingCount: 200 })],
      [],
    );

    expect(matches[0].score).toBeGreaterThanOrEqual(0);
    expect(matches[0].score).toBeLessThanOrEqual(100);
  });
});

describe("helpers", () => {
  it("treats touching ranges as non-overlapping", () => {
    const a = { start: new Date("2026-09-01"), end: new Date("2026-09-05") };
    const b = { start: new Date("2026-09-05"), end: new Date("2026-09-09") };
    expect(overlaps(a, b)).toBe(false);
  });

  it("pulls a thin rating toward the prior", () => {
    expect(bayesianRating(5, 1)).toBeLessThan(5);
    expect(bayesianRating(5, 500)).toBeGreaterThan(4.9);
    expect(bayesianRating(0, 0)).toBe(4.2);
  });
});

describe("operator assignment", () => {
  it("spreads distinct operators across the offers", () => {
    const { matches } = matchOrder(
      order({ needsOperator: true }),
      [
        equipment({ id: "a" }),
        equipment({ id: "b" }),
        equipment({ id: "c" }),
      ],
      [
        operator({ id: "op1", userId: "u1", name: "A", jobsDone: 50 }),
        operator({ id: "op2", userId: "u2", name: "B", jobsDone: 40 }),
        operator({ id: "op3", userId: "u3", name: "C", jobsDone: 30 }),
      ],
    );

    const assigned = matches.map((m) => m.operator?.id);
    expect(new Set(assigned).size).toBe(3);
  });

  it("gives the strongest operator to the strongest machine", () => {
    const { matches } = matchOrder(
      order({ needsOperator: true }),
      [
        equipment({ id: "weak", ratingAvg: 3.2, ratingCount: 40 }),
        equipment({ id: "strong", ratingAvg: 4.9, ratingCount: 40 }),
      ],
      [
        operator({ id: "veteran", userId: "u1", jobsDone: 60, level: "ADVANCED" }),
        operator({ id: "rookie", userId: "u2", jobsDone: 4, level: "BEGINNER", ratingAvg: 4.0, ratingCount: 5 }),
      ],
    );

    const strong = matches.find((m) => m.equipment.id === "strong")!;
    expect(strong.operator?.id).toBe("veteran");
  });

  it("reuses the best operator rather than dropping a machine when they run out", () => {
    const { matches } = matchOrder(
      order({ needsOperator: true }),
      [equipment({ id: "a" }), equipment({ id: "b" }), equipment({ id: "c" })],
      [operator({ id: "only", userId: "u1" })],
    );

    expect(matches).toHaveLength(3);
    expect(matches.every((m) => m.operator?.id === "only")).toBe(true);
  });

  it("prices each offer against the operator actually assigned to it", () => {
    const { matches } = matchOrder(
      order({ needsOperator: true }),
      [equipment({ id: "a" }), equipment({ id: "b" })],
      [
        operator({ id: "pricey", userId: "u1", dailyRate: 200_000, jobsDone: 60 }),
        operator({ id: "cheap", userId: "u2", dailyRate: 100_000, jobsDone: 50 }),
      ],
    );

    for (const match of matches) {
      const expected = 10 * 600_000 + 10 * (match.operator?.dailyRate ?? 0);
      expect(match.quotedAmount).toBe(expected);
    }
  });
});
