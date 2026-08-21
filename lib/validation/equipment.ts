import { z } from "zod";
import { EQUIPMENT_CATEGORIES } from "@/lib/equipment";

const CURRENT_YEAR = new Date().getFullYear();

/** Photos are stored as data URLs, resized in the browser before upload. */
const photoSchema = z
  .string()
  .startsWith("data:image/", "Unsupported image")
  .max(1_500_000, "Image too large");

export const specSchema = z.object({
  name: z.string().trim().min(1).max(40),
  value: z.string().trim().min(1).max(60),
});

export const equipmentSchema = z
  .object({
    category: z.enum(EQUIPMENT_CATEGORIES as [string, ...string[]]),
    make: z.string().trim().min(1, "required").max(60),
    model: z.string().trim().min(1, "required").max(60),
    year: z.coerce
      .number()
      .int()
      .min(1970, "yearTooOld")
      .max(CURRENT_YEAR + 1, "yearTooNew"),

    hourlyRate: z.coerce.number().int().min(0).max(100_000_000),
    dailyRate: z.coerce.number().int().min(1, "required").max(1_000_000_000),
    monthlyRate: z.coerce.number().int().min(1, "required").max(2_000_000_000),

    aimag: z.string().trim().min(1, "required"),
    district: z.string().trim().optional().or(z.literal("")),

    description: z.string().trim().max(1000).optional().or(z.literal("")),
    withOperator: z.boolean(),
    status: z.enum(["ACTIVE", "MAINTENANCE", "INACTIVE"]),

    photos: z.array(photoSchema).max(6, "tooManyPhotos"),
    specs: z.array(specSchema).max(12),
  })
  .refine((data) => data.monthlyRate <= data.dailyRate * 30, {
    // A monthly price above 30 day-rates would make the month the worse deal,
    // which is never what an owner means to publish.
    message: "monthlyAboveDaily",
    path: ["monthlyRate"],
  });

/**
 * `z.coerce` means what the form holds (strings from number inputs) differs from
 * what the schema produces, so react-hook-form needs both sides named.
 */
export type EquipmentFormValues = z.input<typeof equipmentSchema>;
export type EquipmentInput = z.output<typeof equipmentSchema>;

export const availabilityBlockSchema = z
  .object({
    equipmentId: z.string().min(1),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.string().trim().max(120).optional().or(z.literal("")),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "endBeforeStart",
    path: ["endDate"],
  });
