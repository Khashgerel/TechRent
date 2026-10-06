import type { PlannedTransaction } from "../escrow/booking";
import type { QpayCheckResponse, QpayPaymentRow } from "./qpay";

/**
 * Reading QPay's answer, and the ledger entries a settled top-up posts.
 *
 * Both functions are pure. Everything about whether money moved is decided
 * here, from the rows QPay returned, so the rules can be tested without a
 * merchant account: what counts as paid, what a partial payment means, and
 * which accounts a top-up touches.
 */

/** QPay sends amounts as strings like "100.00"; TechRent holds whole tugrik. */
export function parseQpayAmount(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export type PaymentOutcome =
  /** Nothing has been paid yet — the normal state of a fresh invoice. */
  | { state: "unpaid" }
  /** Enough arrived to settle. `paidAmount` is what QPay says was received. */
  | {
      state: "paid";
      paidAmount: number;
      paymentId: string;
      wallet: string | null;
      method: string | null;
    }
  /** Money arrived but less than the invoice. Never settled automatically. */
  | { state: "partial"; paidAmount: number; expected: number; paymentId: string }
  /** The payment came back refunded, so the invoice is not a credit. */
  | { state: "refunded"; paidAmount: number; paymentId: string }
  /** QPay recorded an attempt that did not succeed. */
  | { state: "failed"; paymentId: string };

const isPaid = (row: QpayPaymentRow) => row.payment_status === "PAID";

/**
 * Decides what a `payment/check` response means for an invoice of
 * `expectedAmount`.
 *
 * A refund anywhere in the rows wins over paid rows: the money went back, so
 * the invoice must not credit a wallet. Failed attempts are not money and are
 * ignored unless they are all there is.
 */
export function readCheck(
  response: QpayCheckResponse,
  expectedAmount: number,
): PaymentOutcome {
  const rows = response.rows ?? [];
  if (rows.length === 0) return { state: "unpaid" };

  const refunded = rows.find((row) => row.payment_status === "REFUNDED");
  if (refunded) {
    return {
      state: "refunded",
      paidAmount: parseQpayAmount(refunded.payment_amount),
      paymentId: String(refunded.payment_id),
    };
  }

  const paidRows = rows.filter(isPaid);
  const paidAmount = paidRows.reduce(
    (sum, row) => sum + parseQpayAmount(row.payment_amount),
    0,
  );

  if (paidRows.length > 0) {
    const first = paidRows[0];
    const paymentId = String(first.payment_id);

    if (paidAmount < expectedAmount) {
      return { state: "partial", paidAmount, expected: expectedAmount, paymentId };
    }

    return {
      state: "paid",
      paidAmount,
      paymentId,
      wallet: first.payment_wallet ?? null,
      method: first.payment_type ?? null,
    };
  }

  const failed = rows.find((row) => row.payment_status === "FAILED");
  if (failed) return { state: "failed", paymentId: String(failed.payment_id) };

  // NEW or PARTIAL rows with nothing settled: the payment is still in flight.
  return { state: "unpaid" };
}

/**
 * The answer QPay would have given for an invoice paid in full.
 *
 * QPay's V2 API has no endpoint that marks a sandbox invoice paid, so this
 * stands in for one during development. It is deliberately pure and lives
 * beside the real rules: a simulated payment is read by `readCheck` exactly as
 * a genuine one is, which is the only way the simulation is worth anything.
 * Whether it may be used at all is decided in `./sandbox`.
 */
export function simulatedPaidCheck(amount: number): QpayCheckResponse {
  return {
    count: 1,
    paid_amount: amount,
    rows: [
      {
        payment_id: `SIMULATED-${Date.now()}`,
        payment_status: "PAID",
        payment_amount: amount,
        payment_currency: "MNT",
        payment_wallet: "Simulated sandbox payment",
        payment_type: "P2P",
      },
    ],
  };
}

export type TopupAccounts = {
  wallet: string;
  external: string;
};

/**
 * A top-up is the one transaction where money genuinely enters the platform:
 * it debits EXTERNAL — the world outside — and credits the payer's wallet. The
 * shape is identical to the automatic funding bookings already use, which is
 * why a wallet topped up through QPay and one topped up implicitly are
 * indistinguishable to the rest of the ledger.
 */
export function planTopup(
  amount: number,
  accounts: TopupAccounts,
): PlannedTransaction[] {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("A top-up needs a positive whole amount");
  }

  return [
    {
      type: "TOPUP",
      memo: "QPay-ээр хэтэвч цэнэглэсэн",
      entries: [
        { accountId: accounts.external, amount: -amount },
        { accountId: accounts.wallet, amount },
      ],
    },
  ];
}

/**
 * QPay rejects special characters in `sender_invoice_no`, so our reference is
 * built rather than taken from a cuid: a short prefix, the time in base 36 and
 * a random tail, which stays unique without leaking a user id.
 */
export function senderInvoiceNo(now = new Date(), random = Math.random) {
  const stamp = now.getTime().toString(36).toUpperCase();
  const tail = Math.floor(random() * 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, "0");
  return `TR${stamp}${tail}`;
}
