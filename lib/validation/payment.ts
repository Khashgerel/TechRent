import { z } from "zod";

/** Sandbox-friendly bounds: enough to exercise a real bank app, not a fortune. */
export const MIN_TOPUP = 100;
export const MAX_TOPUP = 10_000_000;

export const topupSchema = z.object({
  amount: z.coerce
    .number()
    .int("wholeTugrik")
    .min(MIN_TOPUP, "topupTooSmall")
    .max(MAX_TOPUP, "topupTooLarge"),
});

export type TopupFormValues = z.input<typeof topupSchema>;
export type TopupInput = z.output<typeof topupSchema>;
