import "server-only";

import { db } from "@/lib/db";
import { balanceOf } from "@/lib/escrow/ledger";
import type { QpayDeeplink } from "./qpay";

/** The wallet page: balance, the invoice in flight, and what came before. */
export async function getWalletPage(userId: string) {
  const [wallet, pending, history, toppedUp] = await Promise.all([
    db.account.findUnique({ where: { userId } }),
    db.paymentInvoice.findFirst({
      where: { userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
    db.paymentInvoice.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    db.paymentInvoice.aggregate({
      where: { userId, status: "PAID" },
      _sum: { paidAmount: true },
    }),
  ]);

  const balance = wallet ? await balanceOf(db, wallet.id) : 0;

  return {
    balance,
    pending: pending ? withDeeplinks(pending) : null,
    history,
    toppedUpTotal: toppedUp._sum.paidAmount ?? 0,
  };
}

export type WalletPage = Awaited<ReturnType<typeof getWalletPage>>;
export type WalletInvoice = WalletPage["history"][number];

/** `deeplinks` is stored as JSON; this is the narrowing the UI needs. */
export function withDeeplinks<T extends { deeplinks: unknown }>(invoice: T) {
  const raw = Array.isArray(invoice.deeplinks) ? invoice.deeplinks : [];

  const deeplinks = raw.filter(
    (entry): entry is QpayDeeplink =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as QpayDeeplink).link === "string" &&
      typeof (entry as QpayDeeplink).name === "string",
  );

  return { ...invoice, deeplinks };
}

export type PendingInvoice = ReturnType<typeof withDeeplinks<WalletInvoice>>;
