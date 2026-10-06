import { describe, expect, it } from "vitest";
import {
  parseQpayAmount,
  planTopup,
  readCheck,
  senderInvoiceNo,
  type TopupAccounts,
} from "../topup";
import type { QpayCheckResponse, QpayPaymentRow } from "../qpay";

const ACCOUNTS: TopupAccounts = {
  wallet: "acc_wallet",
  external: "acc_external",
};

const sumOf = (entries: { amount: number }[]) =>
  entries.reduce((sum, entry) => sum + entry.amount, 0);

function row(overrides: Partial<QpayPaymentRow> = {}): QpayPaymentRow {
  return {
    payment_id: "493622150113497",
    payment_status: "PAID",
    payment_amount: "100.00",
    payment_currency: "MNT",
    payment_wallet: "Хаан банк апп",
    payment_type: "P2P",
    ...overrides,
  };
}

const check = (rows: QpayPaymentRow[]): QpayCheckResponse => ({
  count: rows.length,
  rows,
});

describe("parseQpayAmount", () => {
  it("turns QPay's decimal strings into whole tugrik", () => {
    expect(parseQpayAmount("100.00")).toBe(100);
    expect(parseQpayAmount("25000.50")).toBe(25001);
    expect(parseQpayAmount(100)).toBe(100);
  });

  it("treats anything unreadable as nothing paid", () => {
    expect(parseQpayAmount(null)).toBe(0);
    expect(parseQpayAmount(undefined)).toBe(0);
    expect(parseQpayAmount("")).toBe(0);
    expect(parseQpayAmount("abc")).toBe(0);
  });
});

describe("readCheck", () => {
  it("reads a fresh invoice as unpaid", () => {
    expect(readCheck(check([]), 100)).toEqual({ state: "unpaid" });
  });

  it("settles when the paid rows cover the invoice", () => {
    const outcome = readCheck(check([row()]), 100);

    expect(outcome).toEqual({
      state: "paid",
      paidAmount: 100,
      paymentId: "493622150113497",
      wallet: "Хаан банк апп",
      method: "P2P",
    });
  });

  it("adds up several paid rows", () => {
    const outcome = readCheck(
      check([
        row({ payment_id: "1", payment_amount: "60.00" }),
        row({ payment_id: "2", payment_amount: "40.00" }),
      ]),
      100,
    );

    expect(outcome.state).toBe("paid");
    if (outcome.state === "paid") expect(outcome.paidAmount).toBe(100);
  });

  it("holds back when less than the invoice arrived", () => {
    const outcome = readCheck(check([row({ payment_amount: "40.00" })]), 100);

    expect(outcome).toEqual({
      state: "partial",
      paidAmount: 40,
      expected: 100,
      paymentId: "493622150113497",
    });
  });

  it("credits an overpayment at what actually arrived", () => {
    const outcome = readCheck(check([row({ payment_amount: "150.00" })]), 100);

    expect(outcome.state).toBe("paid");
    if (outcome.state === "paid") expect(outcome.paidAmount).toBe(150);
  });

  it("lets a refund override paid rows", () => {
    const outcome = readCheck(
      check([row(), row({ payment_id: "99", payment_status: "REFUNDED" })]),
      100,
    );

    expect(outcome.state).toBe("refunded");
  });

  it("reports a failed attempt rather than calling it unpaid", () => {
    const outcome = readCheck(
      check([row({ payment_status: "FAILED" })]),
      100,
    );

    expect(outcome).toEqual({ state: "failed", paymentId: "493622150113497" });
  });

  it("treats an in-flight row as unpaid", () => {
    expect(readCheck(check([row({ payment_status: "NEW" })]), 100)).toEqual({
      state: "unpaid",
    });
  });

  it("survives a response with no rows array at all", () => {
    expect(readCheck({ count: 0 } as QpayCheckResponse, 100)).toEqual({
      state: "unpaid",
    });
  });
});

describe("planTopup", () => {
  it("moves the money from outside the platform into the wallet", () => {
    const [transaction] = planTopup(50_000, ACCOUNTS);

    expect(transaction.type).toBe("TOPUP");
    expect(transaction.entries).toEqual([
      { accountId: ACCOUNTS.external, amount: -50_000 },
      { accountId: ACCOUNTS.wallet, amount: 50_000 },
    ]);
  });

  it("balances, like every other transaction in the ledger", () => {
    for (const amount of [1, 100, 1_000_000]) {
      for (const transaction of planTopup(amount, ACCOUNTS)) {
        expect(sumOf(transaction.entries)).toBe(0);
        expect(transaction.entries.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("refuses amounts that are not positive whole tugrik", () => {
    expect(() => planTopup(0, ACCOUNTS)).toThrow();
    expect(() => planTopup(-100, ACCOUNTS)).toThrow();
    expect(() => planTopup(100.5, ACCOUNTS)).toThrow();
  });
});

describe("senderInvoiceNo", () => {
  it("contains only characters QPay accepts", () => {
    for (let i = 0; i < 50; i++) {
      expect(senderInvoiceNo()).toMatch(/^[A-Z0-9]{8,45}$/);
    }
  });

  it("differs for two invoices in the same millisecond", () => {
    const now = new Date("2026-10-06T00:00:00Z");
    const a = senderInvoiceNo(now, () => 0.1);
    const b = senderInvoiceNo(now, () => 0.9);
    expect(a).not.toBe(b);
  });
});
