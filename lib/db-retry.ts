/**
 * Classifying and retrying dropped database connections.
 *
 * Split out from `lib/db.ts` so the policy can be tested directly: the whole
 * point is behaviour under failure, which is awkward to exercise through a live
 * pool but trivial to assert here.
 */

const RETRYABLE_MESSAGES = [
  "server has closed the connection",
  "connection terminated",
  "connection closed",
  "econnreset",
  "econnrefused",
];

const RETRYABLE_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "EPIPE",
  "P1001", // can't reach the database
  "P1002", // timed out reaching the database
  "P1017", // server has closed the connection
]);

/**
 * True when the failure is about the connection rather than the query. A dead
 * socket is worth retrying; a constraint violation never is.
 */
export function isConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const code = (error as { code?: unknown }).code;
  if (typeof code === "string" && RETRYABLE_CODES.has(code)) return true;

  const message = String((error as { message?: unknown }).message ?? "").toLowerCase();
  return RETRYABLE_MESSAGES.some((pattern) => message.includes(pattern));
}

export type RetryOptions = {
  attempts?: number;
  /** Delay before attempt n (1-indexed). Overridable so tests don't sleep. */
  delayMs?: (attempt: number) => number;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Runs `task`, retrying only connection failures. Anything else is rethrown
 * immediately — retrying a genuine query error just delays the same failure.
 */
export async function withConnectionRetry<T>(
  task: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    attempts = 3,
    delayMs = (attempt) => attempt * 150,
    sleep = defaultSleep,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !isConnectionError(error)) throw error;
      await sleep(delayMs(attempt));
    }
  }

  throw lastError;
}
