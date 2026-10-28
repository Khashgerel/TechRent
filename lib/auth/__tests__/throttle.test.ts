import { describe, expect, it } from "vitest";
import {
  checkAttempt,
  lockDurationMs,
  MAX_FAILURES,
  recordFailure,
  subjectsFor,
  WINDOW_MS,
  type AttemptState,
} from "../throttle";

const NOW = new Date("2026-10-28T10:00:00.000Z");
const at = (ms: number) => new Date(NOW.getTime() + ms);

describe("lockDurationMs", () => {
  it("does not lock below the limit", () => {
    for (let f = 0; f < MAX_FAILURES; f++) expect(lockDurationMs(f)).toBe(0);
  });

  it("doubles with each failure past the limit", () => {
    expect(lockDurationMs(MAX_FAILURES)).toBe(60_000);
    expect(lockDurationMs(MAX_FAILURES + 1)).toBe(120_000);
    expect(lockDurationMs(MAX_FAILURES + 2)).toBe(240_000);
  });

  it("caps, so a lockout is never effectively permanent", () => {
    expect(lockDurationMs(MAX_FAILURES + 50)).toBe(60 * 60 * 1000);
  });
});

describe("checkAttempt", () => {
  it("allows a subject that has never failed", () => {
    expect(checkAttempt(null, NOW)).toEqual({ allowed: true });
  });

  it("refuses while locked, and says for how long", () => {
    const state: AttemptState = {
      failures: MAX_FAILURES,
      firstFailed: NOW,
      lastFailed: NOW,
      lockedUntil: at(60_000),
    };
    expect(checkAttempt(state, at(10_000))).toEqual({
      allowed: false,
      retryAfterMs: 50_000,
    });
  });

  it("allows again once the lockout has run its course", () => {
    const state: AttemptState = {
      failures: MAX_FAILURES,
      firstFailed: NOW,
      lastFailed: NOW,
      lockedUntil: at(60_000),
    };
    expect(checkAttempt(state, at(60_001))).toEqual({ allowed: true });
  });

  it("allows a subject with failures but no lock", () => {
    const state: AttemptState = {
      failures: 2,
      firstFailed: NOW,
      lastFailed: NOW,
      lockedUntil: null,
    };
    expect(checkAttempt(state, NOW)).toEqual({ allowed: true });
  });
});

describe("recordFailure", () => {
  it("starts counting from the first failure", () => {
    const next = recordFailure(null, NOW);
    expect(next.failures).toBe(1);
    expect(next.firstFailed).toEqual(NOW);
    expect(next.lockedUntil).toBeNull();
  });

  it("locks once the limit is reached", () => {
    let state: AttemptState = null;
    for (let i = 0; i < MAX_FAILURES; i++) state = recordFailure(state, NOW);
    expect(state!.failures).toBe(MAX_FAILURES);
    expect(state!.lockedUntil).toEqual(at(60_000));
  });

  it("forgives failures older than the window", () => {
    const old: AttemptState = {
      failures: 4,
      firstFailed: NOW,
      lastFailed: NOW,
      lockedUntil: null,
    };
    const next = recordFailure(old, at(WINDOW_MS + 1));
    expect(next.failures).toBe(1);
    expect(next.lockedUntil).toBeNull();
  });

  it("keeps counting inside the window", () => {
    const recent: AttemptState = {
      failures: 4,
      firstFailed: NOW,
      lastFailed: NOW,
      lockedUntil: null,
    };
    const next = recordFailure(recent, at(WINDOW_MS - 1));
    expect(next.failures).toBe(5);
    expect(next.firstFailed).toEqual(NOW);
  });
});

describe("subjectsFor", () => {
  it("counts against the username and the address", () => {
    expect(subjectsFor("Bold", "1.2.3.4")).toEqual([
      "username:bold",
      "ip:1.2.3.4",
    ]);
  });

  it("still counts the username when the address is unknown", () => {
    expect(subjectsFor("Bold", null)).toEqual(["username:bold"]);
  });
});
