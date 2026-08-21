import { describe, expect, it } from "vitest";
import { formatMNT, splitBookingAmount } from "../money";

describe("splitBookingAmount", () => {
  it("splits a total with no tugrik left over", () => {
    const total = 4_830_000;
    const { commissionAmount, ownerPayout, operatorPayout } =
      splitBookingAmount(total, 0.1, 0.25, true);

    expect(commissionAmount + ownerPayout + operatorPayout).toBe(total);
  });

  it("gives the operator nothing when the booking has no operator", () => {
    const { operatorPayout, ownerPayout, commissionAmount } =
      splitBookingAmount(1_000_000, 0.1, 0.25, false);

    expect(operatorPayout).toBe(0);
    expect(ownerPayout).toBe(900_000);
    expect(commissionAmount).toBe(100_000);
  });

  it("never loses a tugrik to rounding, across many awkward totals", () => {
    for (let total = 1; total < 5000; total += 7) {
      const parts = splitBookingAmount(total, 0.1, 0.25, true);
      expect(
        parts.commissionAmount + parts.ownerPayout + parts.operatorPayout,
      ).toBe(total);
    }
  });

  it("takes the commission before splitting the remainder", () => {
    const { commissionAmount, ownerPayout, operatorPayout } =
      splitBookingAmount(10_000_000, 0.1, 0.25, true);

    expect(commissionAmount).toBe(1_000_000);
    // 9,000,000 net: a quarter to the operator, the rest to the owner.
    expect(operatorPayout).toBe(2_250_000);
    expect(ownerPayout).toBe(6_750_000);
  });
});

describe("formatMNT", () => {
  it("renders whole tugrik with a currency suffix", () => {
    expect(formatMNT(5_000_000, "en")).toBe("5,000,000₮");
  });
});
