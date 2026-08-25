import { describe, expect, it, vi } from "vitest";
import { isConnectionError, withConnectionRetry } from "../db-retry";

const noSleep = { sleep: async () => {} };

describe("isConnectionError", () => {
  it("recognises a closed connection by message", () => {
    expect(isConnectionError(new Error("Server has closed the connection."))).toBe(true);
    expect(isConnectionError(new Error("Connection terminated unexpectedly"))).toBe(true);
  });

  it("recognises socket and Prisma connection codes", () => {
    expect(isConnectionError({ code: "ECONNRESET" })).toBe(true);
    expect(isConnectionError({ code: "ECONNREFUSED" })).toBe(true);
    expect(isConnectionError({ code: "P1017" })).toBe(true);
  });

  it("does not treat a real query failure as retryable", () => {
    // Unique-constraint violation — retrying would fail identically.
    expect(isConnectionError({ code: "P2002", message: "Unique constraint failed" })).toBe(false);
    expect(isConnectionError(new Error("column does not exist"))).toBe(false);
    expect(isConnectionError(null)).toBe(false);
    expect(isConnectionError("boom")).toBe(false);
  });
});

describe("withConnectionRetry", () => {
  it("returns the result without retrying when the first attempt works", async () => {
    const task = vi.fn().mockResolvedValue("ok");
    await expect(withConnectionRetry(task, noSleep)).resolves.toBe("ok");
    expect(task).toHaveBeenCalledOnce();
  });

  it("recovers when a dropped connection succeeds on retry", async () => {
    const task = vi
      .fn()
      .mockRejectedValueOnce(new Error("Server has closed the connection."))
      .mockResolvedValue("recovered");

    await expect(withConnectionRetry(task, noSleep)).resolves.toBe("recovered");
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("rethrows a query error immediately, without burning retries", async () => {
    const error = { code: "P2002", message: "Unique constraint failed" };
    const task = vi.fn().mockRejectedValue(error);

    await expect(withConnectionRetry(task, noSleep)).rejects.toBe(error);
    expect(task).toHaveBeenCalledOnce();
  });

  it("gives up after the configured number of attempts", async () => {
    const task = vi.fn().mockRejectedValue(new Error("ECONNRESET"));

    await expect(
      withConnectionRetry(task, { ...noSleep, attempts: 3 }),
    ).rejects.toThrow("ECONNRESET");
    expect(task).toHaveBeenCalledTimes(3);
  });

  it("backs off further with each attempt", async () => {
    const delays: number[] = [];
    const task = vi.fn().mockRejectedValue({ code: "P1017" });

    await expect(
      withConnectionRetry(task, {
        attempts: 3,
        sleep: async (ms) => {
          delays.push(ms);
        },
      }),
    ).rejects.toBeTruthy();

    expect(delays).toEqual([150, 300]);
  });
});
