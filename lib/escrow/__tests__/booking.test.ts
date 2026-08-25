import { describe, expect, it } from "vitest";
import { splitBookingAmount } from "../../money";
import {
  availableEvents,
  canFire,
  heldAmount,
  InvalidTransitionError,
  levelForPoints,
  planTransition,
  pointsForCompletion,
  type BookingAccounts,
  type BookingAmounts,
  type BookingEvent,
} from "../booking";
import type { BookingStatus } from "../../generated/prisma/enums";

const OPERATOR_ACCOUNT = "acc_operator";

const ACCOUNTS: BookingAccounts = {
  company: "acc_company",
  owner: "acc_owner",
  operator: OPERATOR_ACCOUNT,
  escrow: "acc_escrow",
  platformRevenue: "acc_revenue",
  external: "acc_external",
};

/** A booking whose parts add up, built the same way the app builds them. */
function amounts(total = 10_000_000, hasOperator = true): BookingAmounts {
  const split = splitBookingAmount(total, 0.1, 0.25, hasOperator);
  return {
    totalAmount: total,
    depositAmount: Math.round(total * 0.3),
    commissionAmount: split.commissionAmount,
    ownerPayout: split.ownerPayout,
    operatorPayout: split.operatorPayout,
  };
}

const sumOf = (entries: { amount: number }[]) =>
  entries.reduce((s, e) => s + e.amount, 0);

describe("transition rules", () => {
  it("walks the happy path in order", () => {
    expect(canFire("CONFIRM", "PENDING")).toBe(true);
    expect(canFire("START", "CONFIRMED")).toBe(true);
    expect(canFire("COMPLETE", "IN_PROGRESS")).toBe(true);
    expect(canFire("VERIFY", "COMPLETED")).toBe(true);
  });

  it("refuses to skip a step", () => {
    expect(canFire("VERIFY", "PENDING")).toBe(false);
    expect(canFire("START", "PENDING")).toBe(false);
    expect(canFire("COMPLETE", "CONFIRMED")).toBe(false);
  });

  it("refuses to touch a booking that already settled", () => {
    for (const event of ["CONFIRM", "START", "COMPLETE", "VERIFY", "CANCEL"] as const) {
      expect(canFire(event, "PAID")).toBe(false);
      expect(canFire(event, "CANCELLED")).toBe(false);
    }
  });

  it("throws rather than silently doing nothing on an illegal move", () => {
    expect(() =>
      planTransition("VERIFY", "PENDING", amounts(), ACCOUNTS),
    ).toThrow(InvalidTransitionError);
  });

  it("offers no further moves once paid", () => {
    expect(availableEvents("PAID")).toEqual([]);
    expect(availableEvents("CANCELLED")).toEqual([]);
  });
});

describe("every transaction balances", () => {
  const path: { event: BookingEvent; from: BookingStatus }[] = [
    { event: "CREATE", from: "PENDING" },
    { event: "CONFIRM", from: "PENDING" },
    { event: "START", from: "CONFIRMED" },
    { event: "COMPLETE", from: "IN_PROGRESS" },
    { event: "VERIFY", from: "COMPLETED" },
  ];

  it("across the whole happy path", () => {
    for (const step of path) {
      const plan = planTransition(step.event, step.from, amounts(), ACCOUNTS);
      for (const tx of plan.transactions) {
        expect(sumOf(tx.entries)).toBe(0);
      }
    }
  });

  it("across cancellation from every cancellable status", () => {
    for (const status of [
      "PENDING",
      "CONFIRMED",
      "IN_PROGRESS",
      "COMPLETED",
    ] as BookingStatus[]) {
      const plan = planTransition("CANCEL", status, amounts(), ACCOUNTS);
      for (const tx of plan.transactions) {
        expect(sumOf(tx.entries)).toBe(0);
      }
    }
  });

  it("for bookings with no operator", () => {
    const noOperator = { ...ACCOUNTS, operator: null };
    const plan = planTransition("VERIFY", "COMPLETED", amounts(10_000_000, false), noOperator);
    expect(sumOf(plan.transactions[0].entries)).toBe(0);
  });

  it("across many awkward totals", () => {
    for (let total = 101; total < 60_000; total += 997) {
      for (const hasOperator of [true, false]) {
        const a = amounts(total, hasOperator);
        const accounts = hasOperator ? ACCOUNTS : { ...ACCOUNTS, operator: null };
        for (const step of path) {
          const plan = planTransition(step.event, step.from, a, accounts);
          for (const tx of plan.transactions) {
            expect(sumOf(tx.entries)).toBe(0);
          }
        }
      }
    }
  });
});

describe("escrow holds exactly what it should", () => {
  it("holds the deposit, then the full amount once work starts", () => {
    const a = amounts();
    expect(heldAmount("PENDING", a)).toBe(a.depositAmount);
    expect(heldAmount("CONFIRMED", a)).toBe(a.depositAmount);
    expect(heldAmount("IN_PROGRESS", a)).toBe(a.totalAmount);
    expect(heldAmount("COMPLETED", a)).toBe(a.totalAmount);
  });

  it("holds nothing once settled", () => {
    const a = amounts();
    expect(heldAmount("PAID", a)).toBe(0);
    expect(heldAmount("CANCELLED", a)).toBe(0);
  });

  it("releases precisely what it held, to the right parties", () => {
    const a = amounts();
    const plan = planTransition("VERIFY", "COMPLETED", a, ACCOUNTS);
    const entries = plan.transactions[0].entries;

    const escrowLeg = entries.find((e) => e.accountId === ACCOUNTS.escrow)!;
    expect(escrowLeg.amount).toBe(-a.totalAmount);

    const owner = entries.find((e) => e.accountId === ACCOUNTS.owner)!;
    const operator = entries.find((e) => e.accountId === ACCOUNTS.operator)!;
    const revenue = entries.find((e) => e.accountId === ACCOUNTS.platformRevenue)!;

    expect(owner.amount + operator.amount + revenue.amount).toBe(a.totalAmount);
    expect(revenue.amount).toBe(a.commissionAmount);
  });

  it("refunds the client exactly what was still held", () => {
    const a = amounts();

    const early = planTransition("CANCEL", "CONFIRMED", a, ACCOUNTS);
    const earlyRefund = early.transactions[0].entries.find(
      (e) => e.accountId === ACCOUNTS.company,
    )!;
    expect(earlyRefund.amount).toBe(a.depositAmount);

    const late = planTransition("CANCEL", "IN_PROGRESS", a, ACCOUNTS);
    const lateRefund = late.transactions[0].entries.find(
      (e) => e.accountId === ACCOUNTS.company,
    )!;
    expect(lateRefund.amount).toBe(a.totalAmount);
  });

  it("leaves no money behind after a full cycle", () => {
    const a = amounts();
    const balances: Record<string, number> = {};

    const apply = (plan: ReturnType<typeof planTransition>) => {
      for (const tx of plan.transactions) {
        for (const entry of tx.entries) {
          balances[entry.accountId] = (balances[entry.accountId] ?? 0) + entry.amount;
        }
      }
    };

    apply(planTransition("CREATE", "PENDING", a, ACCOUNTS, 0));
    apply(planTransition("CONFIRM", "PENDING", a, ACCOUNTS));
    apply(planTransition("START", "CONFIRMED", a, ACCOUNTS, 0));
    apply(planTransition("COMPLETE", "IN_PROGRESS", a, ACCOUNTS));
    apply(planTransition("VERIFY", "COMPLETED", a, ACCOUNTS));

    expect(balances[ACCOUNTS.escrow]).toBe(0);
    expect(balances[ACCOUNTS.company]).toBe(0);
    expect(balances[ACCOUNTS.owner]).toBe(a.ownerPayout);
    expect(balances[OPERATOR_ACCOUNT]).toBe(a.operatorPayout);
    expect(balances[ACCOUNTS.platformRevenue]).toBe(a.commissionAmount);
    // Everything that entered the platform came from outside it.
    expect(balances[ACCOUNTS.external]).toBe(-a.totalAmount);
    expect(Object.values(balances).reduce((s, v) => s + v, 0)).toBe(0);
  });

  it("returns the client to whole after a cancellation", () => {
    const a = amounts();
    const balances: Record<string, number> = {};
    const apply = (plan: ReturnType<typeof planTransition>) => {
      for (const tx of plan.transactions) {
        for (const entry of tx.entries) {
          balances[entry.accountId] = (balances[entry.accountId] ?? 0) + entry.amount;
        }
      }
    };

    apply(planTransition("CREATE", "PENDING", a, ACCOUNTS, 0));
    apply(planTransition("CANCEL", "PENDING", a, ACCOUNTS));

    expect(balances[ACCOUNTS.escrow]).toBe(0);
    // The client keeps the money they topped up, and escrow is empty.
    expect(balances[ACCOUNTS.company]).toBe(a.depositAmount);
    expect(balances[ACCOUNTS.external]).toBe(-a.depositAmount);
  });
});

describe("wallet funding", () => {
  it("tops up only the shortfall", () => {
    const a = amounts();
    const plan = planTransition("CREATE", "PENDING", a, ACCOUNTS, 1_000_000);

    const topup = plan.transactions.find((t) => t.type === "TOPUP")!;
    const credited = topup.entries.find((e) => e.accountId === ACCOUNTS.company)!;
    expect(credited.amount).toBe(a.depositAmount - 1_000_000);
  });

  it("skips the top-up when the wallet already covers it", () => {
    const a = amounts();
    const plan = planTransition("CREATE", "PENDING", a, ACCOUNTS, 99_000_000);
    expect(plan.transactions.some((t) => t.type === "TOPUP")).toBe(false);
  });
});

describe("operator progression", () => {
  it("awards a base amount plus a rating bonus", () => {
    expect(pointsForCompletion(50, 10, 5)).toBe(100);
    expect(pointsForCompletion(50, 10, null)).toBe(50);
  });

  it("promotes at the configured thresholds", () => {
    expect(levelForPoints(0, 500, 1500)).toBe("BEGINNER");
    expect(levelForPoints(499, 500, 1500)).toBe("BEGINNER");
    expect(levelForPoints(500, 500, 1500)).toBe("INTERMEDIATE");
    expect(levelForPoints(1499, 500, 1500)).toBe("INTERMEDIATE");
    expect(levelForPoints(1500, 500, 1500)).toBe("ADVANCED");
  });
});
