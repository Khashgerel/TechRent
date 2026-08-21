import type { PrismaClient } from "../generated/prisma/client";
import type { Prisma } from "../generated/prisma/client";
import type { AccountKind, TransactionType } from "../generated/prisma/enums";

/**
 * Accepts either the long-lived client or an interactive transaction client, so
 * ledger writes can join a surrounding transaction when one exists.
 */
export type LedgerClient = PrismaClient | Prisma.TransactionClient;

export type EntryInput = {
  accountId: string;
  /** Positive credits the account, negative debits it. */
  amount: number;
};

export type PostInput = {
  type: TransactionType;
  entries: EntryInput[];
  bookingId?: string;
  storeOrderId?: string;
  memo?: string;
  reference?: string;
  createdAt?: Date;
};

export class UnbalancedTransactionError extends Error {
  constructor(readonly delta: number) {
    super(
      `Ledger transaction does not balance: entries sum to ${delta}, expected 0`,
    );
    this.name = "UnbalancedTransactionError";
  }
}

/**
 * Writes one balanced group of entries. This is the only way money is allowed to
 * move — the zero-sum check here is what guarantees the ledger stays auditable.
 */
export async function postTransaction(client: LedgerClient, input: PostInput) {
  const delta = input.entries.reduce((sum, e) => sum + e.amount, 0);
  if (delta !== 0) throw new UnbalancedTransactionError(delta);

  if (input.entries.length < 2) {
    throw new Error("A ledger transaction needs at least two entries");
  }

  return client.ledgerTransaction.create({
    data: {
      type: input.type,
      bookingId: input.bookingId,
      storeOrderId: input.storeOrderId,
      memo: input.memo,
      reference: input.reference,
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
      entries: {
        create: input.entries.map((e) => ({
          accountId: e.accountId,
          amount: e.amount,
          ...(input.createdAt ? { createdAt: input.createdAt } : {}),
        })),
      },
    },
    include: { entries: true },
  });
}

/** Balances are always summed from entries, never read off a stored column. */
export async function balanceOf(client: LedgerClient, accountId: string) {
  const result = await client.ledgerEntry.aggregate({
    where: { accountId },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

export async function balancesOf(client: LedgerClient, accountIds: string[]) {
  if (accountIds.length === 0) return new Map<string, number>();

  const rows = await client.ledgerEntry.groupBy({
    by: ["accountId"],
    where: { accountId: { in: accountIds } },
    _sum: { amount: true },
  });

  const map = new Map(accountIds.map((id) => [id, 0]));
  for (const row of rows) map.set(row.accountId, row._sum.amount ?? 0);
  return map;
}

export async function walletOf(client: LedgerClient, userId: string) {
  const wallet = await client.account.findUnique({ where: { userId } });
  if (!wallet) throw new Error(`No wallet for user ${userId}`);
  return wallet;
}

export async function systemAccount(client: LedgerClient, kind: AccountKind) {
  const account = await client.account.findFirst({ where: { kind } });
  if (!account) throw new Error(`Missing system account: ${kind}`);
  return account;
}

/**
 * Money a user has earned and can withdraw, versus money still held in escrow
 * against their in-flight bookings.
 */
export async function walletSummary(client: LedgerClient, userId: string) {
  const wallet = await walletOf(client, userId);
  const available = await balanceOf(client, wallet.id);
  return { accountId: wallet.id, available };
}
