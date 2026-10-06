import "server-only";

import { qpayEnvironment } from "./qpay";

/**
 * Whether a payment may be simulated instead of made.
 *
 * QPay's V2 API has no endpoint that marks an invoice paid: a sandbox invoice
 * only settles when something actually pays it, through a bank or wallet app
 * pointed at QPay's sandbox. That makes the credit path — the part that moves
 * money — the hardest thing to see working, so the wallet can settle an invoice
 * from a fabricated `payment/check` answer instead.
 *
 * Three conditions must hold, so fake money cannot appear anywhere it matters:
 *   - not a production build,
 *   - QPay pointed at the sandbox,
 *   - `QPAY_SIMULATE_PAYMENTS="true"` set deliberately.
 *
 * The fabricated answer itself is `simulatedPaidCheck` in `./topup`, kept pure
 * so the decision rules that read it can be tested.
 */
export function simulationEnabled() {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.QPAY_SIMULATE_PAYMENTS !== "true") return false;

  try {
    return qpayEnvironment() === "sandbox";
  } catch {
    // A misconfigured environment is not a sandbox.
    return false;
  }
}
