"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import {
  cancelTopupInvoice,
  openTopupInvoice,
  settleTopup,
} from "@/lib/payments/service";
import { QpayApiError, QpayConfigError, qpayConfigured } from "@/lib/payments/qpay";
import { simulationEnabled } from "@/lib/payments/sandbox";
import { simulatedPaidCheck } from "@/lib/payments/topup";
import { topupSchema, type TopupInput } from "@/lib/validation/payment";

export type TopupResult =
  | { ok: true; invoiceId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export type CheckResult =
  | { ok: true; state: string; credited: number }
  | { ok: false; error: string };

async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error("Not authorised");
  return session;
}

/** Turns a QPay or configuration failure into something the UI can say. */
function describe(error: unknown) {
  if (error instanceof QpayConfigError) return "notConfigured";
  if (error instanceof QpayApiError) {
    return error.status === 401 || error.status === 403 ? "unauthorized" : "qpay";
  }
  return "generic";
}

export async function createTopupAction(
  locale: string,
  input: TopupInput,
): Promise<TopupResult> {
  const session = await requireUser();

  if (!qpayConfigured()) return { ok: false, error: "notConfigured" };

  const parsed = topupSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: "validation",
      fieldErrors: { amount: first?.message ?? "invalid" },
    };
  }

  try {
    const invoice = await openTopupInvoice(session.uid, parsed.data.amount);
    revalidatePath(`/${locale}/wallet`);
    return { ok: true, invoiceId: invoice.id };
  } catch (error) {
    console.error("QPay invoice creation failed", error);
    return { ok: false, error: describe(error) };
  }
}

/**
 * The manual counterpart to the callback. QPay's documentation forbids polling
 * on a timer, so this runs only when someone presses the button — which is also
 * the only way to settle a payment while developing against localhost, where a
 * callback cannot reach the app.
 */
export async function checkTopupAction(
  locale: string,
  invoiceId: string,
): Promise<CheckResult> {
  const session = await requireUser();

  try {
    const result = await settleTopup({ id: invoiceId, userId: session.uid });
    if (!result) return { ok: false, error: "notFound" };

    revalidatePath(`/${locale}/wallet`);
    revalidatePath(`/${locale}/store`);

    return { ok: true, state: result.outcome.state, credited: result.credited };
  } catch (error) {
    console.error("QPay payment check failed", error);
    return { ok: false, error: describe(error) };
  }
}

/**
 * Settles an invoice from a fabricated "paid" answer instead of QPay's.
 *
 * Exists because QPay offers no way to pay a sandbox invoice from a desktop, so
 * without this the crediting path can only be seen by arranging a real test
 * payment. Refused unless `simulationEnabled()` agrees — not a production
 * build, QPay on sandbox, and the switch set on purpose.
 */
export async function simulatePaymentAction(
  locale: string,
  invoiceId: string,
): Promise<CheckResult> {
  const session = await requireUser();

  if (!simulationEnabled()) return { ok: false, error: "simulationDisabled" };

  try {
    const result = await settleTopup(
      { id: invoiceId, userId: session.uid },
      { check: async (_id, amount) => simulatedPaidCheck(amount) },
    );
    if (!result) return { ok: false, error: "notFound" };

    revalidatePath(`/${locale}/wallet`);
    revalidatePath(`/${locale}/store`);

    return { ok: true, state: result.outcome.state, credited: result.credited };
  } catch (error) {
    console.error("Simulated QPay settle failed", error);
    return { ok: false, error: describe(error) };
  }
}

export async function cancelTopupAction(locale: string, invoiceId: string) {
  const session = await requireUser();

  try {
    await cancelTopupInvoice(invoiceId, session.uid);
  } catch (error) {
    console.error("QPay invoice cancellation failed", error);
  }

  revalidatePath(`/${locale}/wallet`);
}
