import type { BookingStatus, TransactionType } from "../generated/prisma/enums";

/**
 * The booking lifecycle and the money that moves at each step.
 *
 * `planTransition` is pure: given a booking's amounts, its accounts and the
 * current wallet balance, it returns the ledger transactions to post and the
 * fields to patch. Keeping it free of the database is what lets the balance
 * invariants be tested exhaustively — including cancellation and refund, the
 * paths that are hardest to reach through the UI.
 */

export type BookingEvent =
  | "CREATE"
  | "CONFIRM"
  | "START"
  | "COMPLETE"
  | "VERIFY"
  | "CANCEL";

/** Who may fire each event. Enforced again in the actions layer. */
export const EVENT_ACTOR: Record<BookingEvent, ("COMPANY" | "OWNER" | "OPERATOR")[]> = {
  CREATE: ["COMPANY"],
  CONFIRM: ["OWNER"],
  START: ["OWNER", "OPERATOR"],
  COMPLETE: ["OWNER", "OPERATOR"],
  VERIFY: ["COMPANY"],
  CANCEL: ["COMPANY", "OWNER"],
};

const TRANSITIONS: Record<BookingEvent, { from: BookingStatus[]; to: BookingStatus }> = {
  CREATE: { from: [], to: "PENDING" },
  CONFIRM: { from: ["PENDING"], to: "CONFIRMED" },
  START: { from: ["CONFIRMED"], to: "IN_PROGRESS" },
  COMPLETE: { from: ["IN_PROGRESS"], to: "COMPLETED" },
  // Verification releases the money, so a booking never rests in VERIFIED.
  VERIFY: { from: ["COMPLETED"], to: "PAID" },
  CANCEL: {
    from: ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"],
    to: "CANCELLED",
  },
};

export function canFire(event: BookingEvent, status: BookingStatus) {
  return TRANSITIONS[event].from.includes(status);
}

export function nextStatus(event: BookingEvent) {
  return TRANSITIONS[event].to;
}

export function availableEvents(status: BookingStatus): BookingEvent[] {
  return (Object.keys(TRANSITIONS) as BookingEvent[]).filter(
    (event) => event !== "CREATE" && canFire(event, status),
  );
}

export type BookingAccounts = {
  company: string;
  owner: string;
  /** Null when the booking has no operator. */
  operator: string | null;
  escrow: string;
  platformRevenue: string;
  external: string;
};

export type BookingAmounts = {
  totalAmount: number;
  depositAmount: number;
  commissionAmount: number;
  ownerPayout: number;
  operatorPayout: number;
};

export type PlannedEntry = { accountId: string; amount: number };

export type PlannedTransaction = {
  type: TransactionType;
  memo: string;
  entries: PlannedEntry[];
};

export type TransitionPlan = {
  to: BookingStatus;
  transactions: PlannedTransaction[];
  /** Timestamp column to stamp for this transition. */
  timestampField:
    | "confirmedAt"
    | "startedAt"
    | "completedAt"
    | "verifiedAt"
    | "cancelledAt"
    | null;
};

export class InvalidTransitionError extends Error {
  constructor(event: BookingEvent, status: BookingStatus) {
    super(`Cannot ${event} a booking in status ${status}`);
    this.name = "InvalidTransitionError";
  }
}

/** How much of the client's money escrow is holding at a given status. */
export function heldAmount(status: BookingStatus, amounts: BookingAmounts) {
  switch (status) {
    case "PENDING":
    case "CONFIRMED":
      return amounts.depositAmount;
    case "IN_PROGRESS":
    case "COMPLETED":
      return amounts.totalAmount;
    default:
      return 0;
  }
}

/**
 * Tops the client's wallet up from the outside world when it can't cover what
 * is about to be held. A real deployment would take this from a payment
 * gateway; the ledger shape is identical either way.
 */
function fundingFor(
  accounts: BookingAccounts,
  needed: number,
  balance: number,
): PlannedTransaction[] {
  const shortfall = needed - balance;
  if (shortfall <= 0) return [];

  return [
    {
      type: "TOPUP",
      memo: "Дансаа цэнэглэсэн",
      entries: [
        { accountId: accounts.external, amount: -shortfall },
        { accountId: accounts.company, amount: shortfall },
      ],
    },
  ];
}

export function planTransition(
  event: BookingEvent,
  status: BookingStatus,
  amounts: BookingAmounts,
  accounts: BookingAccounts,
  companyBalance = 0,
): TransitionPlan {
  if (event !== "CREATE" && !canFire(event, status)) {
    throw new InvalidTransitionError(event, status);
  }

  const to = nextStatus(event);

  switch (event) {
    case "CREATE": {
      const deposit = amounts.depositAmount;
      return {
        to,
        timestampField: null,
        transactions: [
          ...fundingFor(accounts, deposit, companyBalance),
          {
            type: "DEPOSIT_HOLD",
            memo: "Урьдчилгаа барьцаа",
            entries: [
              { accountId: accounts.company, amount: -deposit },
              { accountId: accounts.escrow, amount: deposit },
            ],
          },
        ],
      };
    }

    case "CONFIRM":
      return { to, timestampField: "confirmedAt", transactions: [] };

    case "START": {
      const balance = amounts.totalAmount - amounts.depositAmount;
      if (balance <= 0) {
        return { to, timestampField: "startedAt", transactions: [] };
      }
      return {
        to,
        timestampField: "startedAt",
        transactions: [
          ...fundingFor(accounts, balance, companyBalance),
          {
            type: "BALANCE_HOLD",
            memo: "Үлдэгдэл төлбөр",
            entries: [
              { accountId: accounts.company, amount: -balance },
              { accountId: accounts.escrow, amount: balance },
            ],
          },
        ],
      };
    }

    case "COMPLETE":
      return { to, timestampField: "completedAt", transactions: [] };

    case "VERIFY": {
      const entries: PlannedEntry[] = [
        { accountId: accounts.escrow, amount: -amounts.totalAmount },
        { accountId: accounts.owner, amount: amounts.ownerPayout },
        { accountId: accounts.platformRevenue, amount: amounts.commissionAmount },
      ];

      if (accounts.operator && amounts.operatorPayout > 0) {
        entries.push({
          accountId: accounts.operator,
          amount: amounts.operatorPayout,
        });
      }

      return {
        to,
        timestampField: "verifiedAt",
        transactions: [
          {
            type: "RELEASE",
            memo: "Ажил баталгаажсаны дараах тооцоо",
            entries,
          },
        ],
      };
    }

    case "CANCEL": {
      const held = heldAmount(status, amounts);
      if (held <= 0) {
        return { to, timestampField: "cancelledAt", transactions: [] };
      }
      return {
        to,
        timestampField: "cancelledAt",
        transactions: [
          {
            type: "REFUND",
            memo: "Захиалга цуцалснаар буцаасан төлбөр",
            entries: [
              { accountId: accounts.escrow, amount: -held },
              { accountId: accounts.company, amount: held },
            ],
          },
        ],
      };
    }
  }
}

/** Points an operator earns for finishing a job, plus any rating bonus. */
export function pointsForCompletion(
  pointsPerJob: number,
  pointsPerRating: number,
  rating: number | null,
) {
  return pointsPerJob + (rating ? pointsPerRating * rating : 0);
}

export function levelForPoints(
  points: number,
  intermediateAt: number,
  advancedAt: number,
) {
  if (points >= advancedAt) return "ADVANCED" as const;
  if (points >= intermediateAt) return "INTERMEDIATE" as const;
  return "BEGINNER" as const;
}
