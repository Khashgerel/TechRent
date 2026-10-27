import { createHash, timingSafeEqual } from "node:crypto";

/**
 * A shared password in front of the demo personas.
 *
 * The one-click personas exist so a visitor can see each role without an
 * account, which also means anyone holding the URL can walk in. Setting
 * `DEMO_PASSWORD` puts one password in front of them.
 *
 * Closing that door only works if the phone number door closes with it: the
 * seeded numbers are committed to the repository and demo mode prints the OTP
 * on screen, so phone login would otherwise be the easier way past the gate.
 * `phoneLoginBlocked` is what keeps the two in step.
 *
 * Deliberately free of `server-only` and of any database import, so the
 * comparison can be tested directly.
 */

/** Demo deployments show the code on screen; production would send it over SMS. */
export const isDemoMode = () => process.env.DEMO_MODE !== "false";

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

/**
 * Constant-time comparison. Both sides are hashed first so the lengths always
 * match, which keeps `timingSafeEqual` from throwing and stops the comparison
 * leaking how long the real password is.
 */
export function passwordMatches(expected: string, given: string) {
  // An unset password must never match, least of all an empty guess.
  if (!expected) return false;
  return timingSafeEqual(digest(expected), digest(given));
}

/** Whether a password stands in front of the demo personas. */
export function demoGateEnabled() {
  return Boolean(process.env.DEMO_PASSWORD);
}

/**
 * Phone + OTP stays switched off for as long as the gate is the way in.
 *
 * Tied to demo mode as well, so a real deployment — which turns demo mode off
 * and sends codes over SMS — always keeps a way to sign in.
 */
export function phoneLoginBlocked() {
  return demoGateEnabled() && isDemoMode();
}

export function checkDemoPassword(given: string) {
  return passwordMatches(process.env.DEMO_PASSWORD ?? "", given);
}
