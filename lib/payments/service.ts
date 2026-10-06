import "server-only";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { postTransaction } from "@/lib/escrow/ledger";
import {
  cancelInvoice,
  checkPayment,
  createInvoice,
  qpayEnvironment,
  type QpayCheckResponse,
} from "./qpay";
import { planTopup, readCheck, senderInvoiceNo, type PaymentOutcome } from "./topup";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { PaymentInvoiceStatus } from "@/lib/generated/prisma/enums";

/**
 * The database side of a QPay top-up: open an invoice, and settle it once QPay
 * confirms the money arrived.
 *
 * Settling is idempotent by construction. QPay may call the callback more than
 * once, and the visitor may press "check" at the same moment, so the write that
 * claims an invoice is a conditional update — only the caller that flips
 * `PENDING` to `PAID` goes on to post to the ledger.
 */

/** Where QPay should send its notification. */
async function callbackBaseUrl() {
  const configured = process.env.QPAY_CALLBACK_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  // Local development: QPay cannot reach this, which is why the UI also offers
  // an explicit check. Set QPAY_CALLBACK_BASE_URL to a tunnel to get callbacks.
  const host = (await headers()).get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export class NoInvoiceIdError extends Error {
  constructor() {
    super("QPay did not return an invoice_id");
    this.name = "NoInvoiceIdError";
  }
}

export async function openTopupInvoice(userId: string, amount: number) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, name: true, phone: true },
  });

  const reference = senderInvoiceNo();
  const base = await callbackBaseUrl();

  // The reference travels in the callback URL so a notification can be matched
  // to its invoice without trusting anything else in the request.
  const callbackUrl = `${base}/api/qpay/callback?invoice=${reference}`;

  const created = await createInvoice({
    senderInvoiceNo: reference,
    receiverCode: user.id,
    description: `TechRent wallet top-up ${amount}MNT`,
    amount,
    callbackUrl,
  });

  if (!created.invoice_id) throw new NoInvoiceIdError();

  return db.paymentInvoice.create({
    data: {
      userId: user.id,
      provider: qpayEnvironment() === "sandbox" ? "QPAY_SANDBOX" : "QPAY_PRODUCTION",
      purpose: "WALLET_TOPUP",
      status: "PENDING",
      senderInvoiceNo: reference,
      invoiceId: created.invoice_id,
      amount,
      qrText: created.qr_text,
      qrImage: created.qr_image,
      shortUrl: created.qPay_shortUrl,
      deeplinks: (created.urls ?? []) as unknown as Prisma.InputJsonValue,
    },
  });
}

export type SettleResult = {
  status: PaymentInvoiceStatus;
  outcome: PaymentOutcome;
  /** What this call credited. Zero when it was already settled. */
  credited: number;
  invoiceId: string;
};

type InvoiceLookup = { id: string; userId?: string } | { senderInvoiceNo: string };

export type SettleOptions = {
  /**
   * How to ask what was paid. Defaults to QPay's `payment/check`; the sandbox
   * simulation substitutes a fabricated answer here, which keeps the decision
   * rules and the crediting identical either way.
   */
  check?: (invoiceId: string, amount: number) => Promise<QpayCheckResponse>;
};

/**
 * Asks QPay about an invoice and, if it is paid, credits the wallet.
 *
 * Returns `null` when the invoice is unknown, so a stray callback is a
 * non-event rather than an error.
 */
export async function settleTopup(
  lookup: InvoiceLookup,
  options: SettleOptions = {},
): Promise<SettleResult | null> {
  const invoice = await db.paymentInvoice.findFirst({
    where: "id" in lookup ? { id: lookup.id, userId: lookup.userId } : lookup,
  });

  if (!invoice) return null;
  if (!invoice.invoiceId) return null;

  if (invoice.status !== "PENDING") {
    // Already decided. Report the stored state without touching QPay again.
    return {
      status: invoice.status,
      outcome:
        invoice.status === "PAID"
          ? {
              state: "paid",
              paidAmount: invoice.paidAmount,
              paymentId: invoice.qpayPaymentId ?? "",
              wallet: null,
              method: null,
            }
          : { state: "unpaid" },
      credited: 0,
      invoiceId: invoice.id,
    };
  }

  const ask = options.check ?? ((invoiceId: string) => checkPayment(invoiceId));
  const response = await ask(invoice.invoiceId, invoice.amount);
  const outcome = readCheck(response, invoice.amount);
  const checkedAt = new Date();

  if (outcome.state === "unpaid" || outcome.state === "partial") {
    await db.paymentInvoice.update({
      where: { id: invoice.id },
      data: {
        lastCheckedAt: checkedAt,
        paidAmount: outcome.state === "partial" ? outcome.paidAmount : 0,
      },
    });
    return { status: "PENDING", outcome, credited: 0, invoiceId: invoice.id };
  }

  if (outcome.state === "failed" || outcome.state === "refunded") {
    await db.paymentInvoice.update({
      where: { id: invoice.id },
      data: {
        status: outcome.state === "failed" ? "FAILED" : "CANCELLED",
        lastCheckedAt: checkedAt,
        qpayPaymentId: outcome.paymentId,
      },
    });
    return {
      status: outcome.state === "failed" ? "FAILED" : "CANCELLED",
      outcome,
      credited: 0,
      invoiceId: invoice.id,
    };
  }

  const [wallet, external] = await Promise.all([
    db.account.findUniqueOrThrow({ where: { userId: invoice.userId } }),
    db.account.findFirstOrThrow({ where: { kind: "EXTERNAL" } }),
  ]);

  const credited = await db.$transaction((tx) =>
    creditTopup(tx, {
      invoiceId: invoice.id,
      userId: invoice.userId,
      senderInvoiceNo: invoice.senderInvoiceNo,
      amount: outcome.paidAmount,
      qpayPaymentId: outcome.paymentId,
      accounts: { wallet: wallet.id, external: external.id },
      at: checkedAt,
    }),
  );

  return { status: "PAID", outcome, credited, invoiceId: invoice.id };
}

export type CreditTopupInput = {
  invoiceId: string;
  userId: string;
  senderInvoiceNo: string;
  amount: number;
  qpayPaymentId: string;
  accounts: { wallet: string; external: string };
  at: Date;
};

/**
 * Moves the money for one settled invoice, and returns what it credited —
 * zero when someone else got there first.
 *
 * Takes a transaction client rather than opening its own, so the claim, the
 * ledger entries, the link between them and the notification either all land
 * or none do. Separate from `settleTopup` because this is the step worth
 * exercising directly: it is where a double credit would happen.
 */
export async function creditTopup(
  tx: Prisma.TransactionClient,
  input: CreditTopupInput,
) {
  // The claim: whoever flips PENDING → PAID owns the credit. A second caller
  // updates nothing and walks away, so the wallet is credited exactly once.
  const claim = await tx.paymentInvoice.updateMany({
    where: { id: input.invoiceId, status: "PENDING", ledgerTransactionId: null },
    data: {
      status: "PAID",
      paidAmount: input.amount,
      qpayPaymentId: input.qpayPaymentId,
      paidAt: input.at,
      lastCheckedAt: input.at,
    },
  });

  if (claim.count !== 1) return 0;

  let transactionId: string | null = null;
  for (const transaction of planTopup(input.amount, input.accounts)) {
    const posted = await postTransaction(tx, {
      ...transaction,
      reference: input.senderInvoiceNo,
    });
    transactionId = posted.id;
  }

  await tx.paymentInvoice.update({
    where: { id: input.invoiceId },
    data: { ledgerTransactionId: transactionId },
  });

  await tx.notification.create({
    data: {
      userId: input.userId,
      type: "WALLET_TOPPED_UP",
      data: { amount: input.amount },
      link: "/wallet",
    },
  });

  return input.amount;
}

/** Abandons a pending invoice, at QPay's end as well as ours. */
export async function cancelTopupInvoice(id: string, userId: string) {
  const invoice = await db.paymentInvoice.findFirst({
    where: { id, userId, status: "PENDING" },
  });
  if (!invoice) return false;

  if (invoice.invoiceId) {
    // A cancellation QPay refuses (already paid, already gone) must not strand
    // our row — the next check decides what really happened.
    try {
      await cancelInvoice(invoice.invoiceId);
    } catch {
      return false;
    }
  }

  await db.paymentInvoice.update({
    where: { id: invoice.id },
    data: { status: "CANCELLED" },
  });

  return true;
}
