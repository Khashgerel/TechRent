import { z } from "zod";

/**
 * Rates are entered as percentages because that is how they are talked about;
 * the action converts them to the fractions `PlatformSettings` stores.
 */
export const settingsSchema = z
  .object({
    commissionPercent: z.coerce.number().min(0).max(50),
    depositPercent: z.coerce.number().min(0).max(100),
    operatorSharePercent: z.coerce.number().min(0).max(100),

    levelUpIntermediate: z.coerce.number().int().min(1).max(100_000),
    levelUpAdvanced: z.coerce.number().int().min(1).max(1_000_000),

    pointsPerJob: z.coerce.number().int().min(0).max(10_000),
    pointsPerRating: z.coerce.number().int().min(0).max(10_000),
  })
  .refine((d) => d.levelUpAdvanced > d.levelUpIntermediate, {
    message: "levelOrder",
    path: ["levelUpAdvanced"],
  });

export type SettingsFormValues = z.input<typeof settingsSchema>;
export type SettingsInput = z.output<typeof settingsSchema>;

export const partUpdateSchema = z.object({
  price: z.coerce.number().int().min(0).max(2_000_000_000),
  stock: z.coerce.number().int().min(0).max(100_000),
  active: z.boolean(),
});

export type PartUpdateInput = z.output<typeof partUpdateSchema>;
