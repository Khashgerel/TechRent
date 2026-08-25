import { describe, expect, it } from "vitest";
import { MAX_LINE_QUANTITY } from "../catalog";
import {
  planPurchase,
  planRefund,
  priceCart,
  type PricedPart,
  type StoreAccounts,
} from "../purchase";

const ACCOUNTS: StoreAccounts = {
  buyer: "acc_buyer",
  platformRevenue: "acc_revenue",
  external: "acc_external",
};

const PARTS: PricedPart[] = [
  { id: "filter", sku: "TR-FL-1001", price: 68_000, stock: 10, active: true },
  { id: "pump", sku: "TR-HY-2001", price: 4_850_000, stock: 1, active: true },
  { id: "sold_out", sku: "TR-UC-3001", price: 6_450_000, stock: 0, active: true },
  { id: "delisted", sku: "TR-EL-5002", price: 1_150_000, stock: 4, active: false },
];

const sumOf = (entries: { amount: number }[]) =>
  entries.reduce((sum, entry) => sum + entry.amount, 0);

describe("priceCart", () => {
  it("prices from the part rows, not from anything the caller passed", () => {
    const cart = priceCart(PARTS, [
      { partId: "filter", quantity: 3 },
      { partId: "pump", quantity: 1 },
    ]);

    expect(cart.problems).toEqual([]);
    expect(cart.total).toBe(68_000 * 3 + 4_850_000);
    expect(cart.lines.map((line) => line.unitPrice)).toEqual([68_000, 4_850_000]);
  });

  it("merges repeated lines for the same part", () => {
    const cart = priceCart(PARTS, [
      { partId: "filter", quantity: 2 },
      { partId: "filter", quantity: 3 },
    ]);

    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].quantity).toBe(5);
    expect(cart.total).toBe(68_000 * 5);
  });

  it("catches the merged quantity, not just each half", () => {
    const cart = priceCart(PARTS, [
      { partId: "pump", quantity: 1 },
      { partId: "pump", quantity: 1 },
    ]);

    expect(cart.lines).toEqual([]);
    expect(cart.problems).toEqual([
      { partId: "pump", reason: "insufficientStock", available: 1 },
    ]);
  });

  it("reports every way a line can fail", () => {
    const cart = priceCart(PARTS, [
      { partId: "ghost", quantity: 1 },
      { partId: "delisted", quantity: 1 },
      { partId: "sold_out", quantity: 1 },
      { partId: "filter", quantity: 40 },
    ]);

    expect(cart.lines).toEqual([]);
    expect(cart.problems.map((p) => p.reason)).toEqual([
      "notFound",
      "unavailable",
      "outOfStock",
      "insufficientStock",
    ]);
  });

  it("rejects quantities that aren't whole, positive, and within the cap", () => {
    for (const quantity of [0, -2, 1.5, MAX_LINE_QUANTITY + 1]) {
      const cart = priceCart(PARTS, [{ partId: "filter", quantity }]);
      expect(cart.lines).toEqual([]);
      expect(cart.problems[0].reason).toBe("badQuantity");
    }
  });

  it("keeps the good lines when only one of them is broken", () => {
    const cart = priceCart(PARTS, [
      { partId: "filter", quantity: 2 },
      { partId: "sold_out", quantity: 1 },
    ]);

    expect(cart.lines.map((line) => line.partId)).toEqual(["filter"]);
    expect(cart.total).toBe(136_000);
    expect(cart.problems).toHaveLength(1);
  });

  it("is empty, not negative, for an empty cart", () => {
    expect(priceCart(PARTS, [])).toEqual({ lines: [], total: 0, problems: [] });
  });
});

describe("planPurchase", () => {
  it("moves the money from the buyer to platform revenue", () => {
    const plan = planPurchase(500_000, ACCOUNTS, 900_000);

    expect(plan).toHaveLength(1);
    expect(plan[0].type).toBe("STORE_PURCHASE");
    expect(plan[0].entries).toEqual([
      { accountId: ACCOUNTS.buyer, amount: -500_000 },
      { accountId: ACCOUNTS.platformRevenue, amount: 500_000 },
    ]);
  });

  it("tops the wallet up from outside when it can't cover the basket", () => {
    const plan = planPurchase(500_000, ACCOUNTS, 120_000);

    expect(plan.map((t) => t.type)).toEqual(["TOPUP", "STORE_PURCHASE"]);
    const topup = plan[0].entries.find((e) => e.accountId === ACCOUNTS.buyer);
    expect(topup?.amount).toBe(380_000);
  });

  it("tops up the whole amount for an empty wallet", () => {
    const plan = planPurchase(500_000, ACCOUNTS, 0);
    expect(plan[0].entries).toEqual([
      { accountId: ACCOUNTS.external, amount: -500_000 },
      { accountId: ACCOUNTS.buyer, amount: 500_000 },
    ]);
  });

  it("leaves every transaction balanced, at any starting balance", () => {
    for (const balance of [0, 1, 499_999, 500_000, 10_000_000]) {
      const plan = planPurchase(500_000, ACCOUNTS, balance);
      for (const transaction of plan) {
        expect(sumOf(transaction.entries)).toBe(0);
        expect(transaction.entries.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("never leaves the buyer's wallet negative", () => {
    for (const balance of [0, 200_000, 500_000]) {
      const plan = planPurchase(500_000, ACCOUNTS, balance);
      const movement = plan.flatMap((t) =>
        t.entries.filter((e) => e.accountId === ACCOUNTS.buyer),
      );
      expect(balance + sumOf(movement)).toBeGreaterThanOrEqual(0);
    }
  });

  it("refuses a purchase with nothing to charge for", () => {
    expect(() => planPurchase(0, ACCOUNTS, 100)).toThrow();
    expect(() => planPurchase(-1, ACCOUNTS, 100)).toThrow();
  });
});

describe("planRefund", () => {
  it("returns the money to the buyer out of platform revenue", () => {
    const [refund] = planRefund(362_000, ACCOUNTS);

    expect(refund.type).toBe("REFUND");
    expect(sumOf(refund.entries)).toBe(0);
    expect(refund.entries).toEqual([
      { accountId: ACCOUNTS.platformRevenue, amount: -362_000 },
      { accountId: ACCOUNTS.buyer, amount: 362_000 },
    ]);
  });

  it("undoes a purchase exactly, leaving both sides where they started", () => {
    const total = 500_000;
    const movement = [
      ...planPurchase(total, ACCOUNTS, total),
      ...planRefund(total, ACCOUNTS),
    ].flatMap((transaction) => transaction.entries);

    for (const account of Object.values(ACCOUNTS)) {
      const net = sumOf(movement.filter((e) => e.accountId === account));
      expect(net).toBe(0);
    }
  });

  it("refuses to refund nothing", () => {
    expect(() => planRefund(0, ACCOUNTS)).toThrow();
  });
});
