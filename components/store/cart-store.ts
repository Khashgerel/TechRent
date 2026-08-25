import { MAX_LINE_QUANTITY } from "@/lib/store/catalog";

/**
 * The cart lives outside React, in `localStorage`, so it survives a reload and
 * a navigation between the store's tabs. Components read it through
 * `useSyncExternalStore`, which is what lets the server render an empty cart and
 * the browser swap in the stored one without a hydration mismatch.
 *
 * Quantities here are intentions only — the server re-prices every line and
 * re-checks stock at checkout.
 */

export type Cart = Record<string, number>;

const KEY = "techrent.cart";
const EMPTY: Cart = {};

const listeners = new Set<() => void>();

function parse(raw: string | null): Cart {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return EMPTY;

    const cart: Cart = {};
    for (const [id, quantity] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof quantity === "number" && quantity >= 1) {
        cart[id] = Math.min(Math.floor(quantity), MAX_LINE_QUANTITY);
      }
    }
    return cart;
  } catch {
    return EMPTY;
  }
}

// Read once at module load: the snapshot has to keep a stable identity between
// renders, so it can't be recomputed inside `getSnapshot`.
let snapshot: Cart =
  typeof window === "undefined" ? EMPTY : parse(window.localStorage.getItem(KEY));

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCart() {
  return snapshot;
}

/** The server has no storage to read, so it always renders an empty cart. */
export function getServerCart() {
  return EMPTY;
}

function commit(next: Cart) {
  snapshot = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // A blocked or full storage shouldn't take the cart down with it.
  }
  for (const listener of listeners) listener();
}

/** Quantity of zero or less removes the line; `max` caps it at stock. */
export function setQuantity(partId: string, quantity: number, max = MAX_LINE_QUANTITY) {
  const next = { ...snapshot };
  const capped = Math.min(Math.floor(quantity), max, MAX_LINE_QUANTITY);

  if (capped <= 0) delete next[partId];
  else next[partId] = capped;

  commit(next);
}

export function clearCart() {
  commit({});
}
