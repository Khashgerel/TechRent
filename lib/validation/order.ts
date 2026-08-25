import { z } from "zod";
import { EQUIPMENT_CATEGORIES } from "@/lib/equipment";

export const orderSchema = z
  .object({
    title: z.string().trim().min(3, "required").max(120),
    description: z.string().trim().max(1000).optional().or(z.literal("")),
    category: z.enum(EQUIPMENT_CATEGORIES as [string, ...string[]]),

    startDate: z.coerce.date(),
    endDate: z.coerce.date(),

    aimag: z.string().trim().min(1, "required"),
    district: z.string().trim().optional().or(z.literal("")),

    needsOperator: z.boolean(),

    budgetMin: z.coerce.number().int().min(0).max(2_000_000_000).optional(),
    budgetMax: z.coerce.number().int().min(0).max(2_000_000_000).optional(),
  })
  .refine((d) => d.endDate > d.startDate, {
    message: "endBeforeStart",
    path: ["endDate"],
  })
  .refine(
    (d) => !d.budgetMin || !d.budgetMax || d.budgetMax >= d.budgetMin,
    { message: "budgetInverted", path: ["budgetMax"] },
  );

export type OrderFormValues = z.input<typeof orderSchema>;
export type OrderInput = z.output<typeof orderSchema>;
