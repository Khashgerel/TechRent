/**
 * Rate limiting for staff sign-in.
 *
 * A password is guessable in a way a one-time code is not, so failures are
 * counted and a subject is locked out for a while once there have been too
 * many. Two subjects are counted per attempt — the username and the client
 * address — so that one attacker cannot lock every account out by hammering
 * usernames, and one account cannot be brute-forced from many addresses.
 *
 * The decisions here are pure and take the current state as an argument; the
 * database does the counting (see `lib/auth/staff-login.ts`). That split is
 * what lets the backoff curve be tested exhaustively without a database.
 */

export const MAX_FAILURES = 5;
/** Failures older than this are forgiven, so a typo last week costs nothing. */
export const WINDOW_MS = 15 * 60 * 1000;
const BASE_LOCK_MS = 60 * 1000;
const MAX_LOCK_MS = 60 * 60 * 1000;

export type AttemptState = {
  failures: number;
  firstFailed: Date;
  lastFailed: Date;
  lockedUntil: Date | null;
} | null;

/** How long to lock out after `failures` failures — doubling, then capped. */
export function lockDurationMs(failures: number) {
  const over = failures - MAX_FAILURES;
  if (over < 0) return 0;
  return Math.min(BASE_LOCK_MS * 2 ** over, MAX_LOCK_MS);
}

/**
 * Whether this subject may try right now, and if not, for how long.
 *
 * A lockout that has expired is not a refusal: it has simply run its course.
 */
export function checkAttempt(state: AttemptState, now: Date) {
  if (!state) return { allowed: true as const };

  if (state.lockedUntil && state.lockedUntil > now) {
    return {
      allowed: false as const,
      retryAfterMs: state.lockedUntil.getTime() - now.getTime(),
    };
  }

  return { allowed: true as const };
}

/**
 * The state to store after a failure.
 *
 * Counting restarts when the previous failure is older than the window, so
 * occasional mistakes never accumulate into a lockout.
 */
export function recordFailure(state: AttemptState, now: Date) {
  const withinWindow =
    state !== null && now.getTime() - state.firstFailed.getTime() < WINDOW_MS;

  const failures = withinWindow ? state.failures + 1 : 1;
  const lockMs = lockDurationMs(failures);

  return {
    failures,
    firstFailed: withinWindow ? state.firstFailed : now,
    lastFailed: now,
    lockedUntil: lockMs > 0 ? new Date(now.getTime() + lockMs) : null,
  };
}

/** The subject keys an attempt is counted against. */
export function subjectsFor(username: string, ip: string | null) {
  const subjects = [`username:${username.toLowerCase()}`];
  if (ip) subjects.push(`ip:${ip}`);
  return subjects;
}
