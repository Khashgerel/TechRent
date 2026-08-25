import type { PlannedTransaction } from "../escrow/booking";
import { MAX_LINE_QUANTITY } from "./catalog";

/**
 * Cart pricing and the money a checkout moves.
 *
 * Both functions are pure: prices, stock and the ledger plan are decided from
 * the rows the caller loaded, never from what the browser posted. That is what
 * makes a cart safe to keep in the client — the server re-prices everything on
 * the way in, and these are the functions the tests can pin down.
 */

export type CartItem = {
  partId: string;
  quantity: number;
};

/** The part fields pricing needs — a subset of the `Part` row. */
export type PricedPart = {
  id: string;
  sku: string;
  price: number;
  stock: number;
  active: boolean;
};

export type CartIssue =
  | "notFound"
  | "unavailable"
  | "outOfStock"
  | "insufficientStock"
  | "badQuantity";

export type CartLine = {
  partId: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type CartProblem = {
  partId: string;
  reason: CartIssue;
  /** How many the warehouse can actually supply right now. */
  available: number;
};

export type PricedCart = {
  lines: CartLine[];
  total: number;
  problems: CartProblem[];
};

/** Two lines for the same part are one line — a browser can send either shape. */
function mergeItems(items: CartItem[]) {
  const merged = new Map<string, number>();
  for (const item of items) {
    merged.set(item.partId, (merged.get(item.partId) ?? 0) + item.quantity);
  }
  return merged;
}

export function priceCart(parts: PricedPart[], items: CartItem[]): PricedCart {
  const byId = new Map(parts.map((part) => [part.id, part]));
  const lines: CartLine[] = [];
  const problems: CartProblem[] = [];

  for (const [partId, quantity] of mergeItems(items)) {
    const part = byId.get(partId);

    if (!part) {
      problems.push({ partId, reason: "notFound", available: 0 });
      continue;
    }
    if (!part.active) {
      problems.push({ partId, reason: "unavailable", available: 0 });
      continue;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
      problems.push({ partId, reason: "badQuantity", available: part.stock });
      continue;
    }
    if (part.stock === 0) {
      problems.push({ partId, reason: "outOfStock", available: 0 });
      continue;
    }
    if (quantity > part.stock) {
      problems.push({ partId, reason: "insufficientStock", available: part.stock });
      continue;
    }

    lines.push({
      partId,
      sku: part.sku,
      quantity,
      unitPrice: part.price,
      lineTotal: part.price * quantity,
    });
  }

  return {
    lines,
    total: lines.reduce((sum, line) => sum + line.lineTotal, 0),
    problems,
  };
}

export type StoreAccounts = {
  buyer: string;
  platformRevenue: string;
  external: string;
};

/**
 * A store purchase is a straight sale, not an escrow hold: the money leaves the
 * buyer's wallet and lands in platform revenue in one balanced transaction. The
 * store sells the platform's own inventory, so there is no third party to hold
 * it for. As with bookings, a wallet that can't cover the basket is topped up
 * from the outside world first.
 */
export function planPurchase(
  total: number,
  accounts: StoreAccounts,
  balance = 0,
): PlannedTransaction[] {
  if (total <= 0) throw new Error("A store purchase needs a positive total");

  const shortfall = total - balance;
  const transactions: PlannedTransaction[] = [];

  if (shortfall > 0) {
    transactions.push({
      type: "TOPUP",
      memo: "Дансаа цэнэглэсэн",
      entries: [
        { accountId: accounts.external, amount: -shortfall },
        { accountId: accounts.buyer, amount: shortfall },
      ],
    });
  }

  transactions.push({
    type: "STORE_PURCHASE",
    memo: "Сэлбэг, үйлчилгээний худалдан авалт",
    entries: [
      { accountId: accounts.buyer, amount: -total },
      { accountId: accounts.platformRevenue, amount: total },
    ],
  });

  return transactions;
}

/**
 * Cancelling a paid order hands the money back the way it came — out of
 * platform revenue, into the buyer's wallet. The top-up that funded it is not
 * unwound: the money did leave the bank, and the wallet is where it now sits.
 */
export function planRefund(
  total: number,
  accounts: StoreAccounts,
): PlannedTransaction[] {
  if (total <= 0) throw new Error("A refund needs a positive total");

  return [
    {
      type: "REFUND",
      memo: "Дэлгүүрийн захиалга цуцалснаар буцаасан төлбөр",
      entries: [
        { accountId: accounts.platformRevenue, amount: -total },
        { accountId: accounts.buyer, amount: total },
      ],
    },
  ];
}
