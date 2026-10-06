import { settleTopup } from "@/lib/payments/service";

/**
 * QPay's payment notification.
 *
 * The contract is QPay's, not ours: the method is GET, and the response must be
 * HTTP 200 with the body `SUCCESS` and nothing else. Anything in the request is
 * treated as a hint only — the amount and status come from asking QPay's check
 * API about the invoice, so a forged call can at worst cause an extra check.
 *
 * Reached outside the locale routing and the session guard, which the proxy's
 * matcher already excludes for `/api`.
 */

/**
 * A fresh response per call: a `Response` body can only be read once, so a
 * shared instance answers the second request with an empty body — and QPay
 * treats anything other than the literal `SUCCESS` as a failed notification.
 */
const success = () =>
  new Response("SUCCESS", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  // Our own reference, placed in the callback URL when the invoice was created.
  const reference = params.get("invoice");
  const paymentId =
    params.get("qpay_payment_id") ?? params.get("payment_id") ?? null;

  if (!reference) {
    console.warn("QPay callback without an invoice reference", {
      paymentId,
      url: request.url,
    });
    // Nothing to act on, but QPay must still see its expected answer.
    return success();
  }

  try {
    const result = await settleTopup({ senderInvoiceNo: reference });

    if (!result) {
      console.warn("QPay callback for an unknown invoice", { reference, paymentId });
      return success();
    }

    console.info("QPay callback settled", {
      reference,
      state: result.outcome.state,
      credited: result.credited,
    });

    return success();
  } catch (error) {
    // A 500 leaves the door open for QPay to try again, which is what we want
    // when the failure is ours (a dropped database connection, say).
    console.error("QPay callback failed", { reference, paymentId, error });
    return new Response("ERROR", { status: 500 });
  }
}
