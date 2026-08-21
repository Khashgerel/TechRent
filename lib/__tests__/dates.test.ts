import { describe, expect, it } from "vitest";
import { formatRange } from "../dates";

describe("formatRange", () => {
  it("states the year once for a range inside one month", () => {
    const r = formatRange(new Date(2026, 7, 16), new Date(2026, 7, 29), "mn");
    expect(r).toBe("2026.08.16–29");
  });

  it("keeps both months when the range crosses one", () => {
    const r = formatRange(new Date(2026, 7, 28), new Date(2026, 8, 4), "mn");
    expect(r).toBe("2026.08.28 – 09.04");
  });

  it("reads naturally in English", () => {
    expect(formatRange(new Date(2026, 7, 16), new Date(2026, 7, 29), "en")).toBe(
      "16–29 Aug 2026",
    );
    expect(formatRange(new Date(2026, 7, 28), new Date(2026, 8, 4), "en")).toBe(
      "28 Aug – 4 Sep 2026",
    );
  });

  it("spells out both ends when the years differ", () => {
    const r = formatRange(new Date(2025, 11, 28), new Date(2026, 0, 6), "en");
    expect(r).toContain("2025");
    expect(r).toContain("2026");
  });
});
