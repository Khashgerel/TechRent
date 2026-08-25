import { z } from "zod";

export const reviewSchema = z.object({
  bookingId: z.string().min(1),
  subjectType: z.enum(["OPERATOR", "EQUIPMENT", "COMPANY"]),
  subjectId: z.string().min(1),

  rating: z.coerce.number().int().min(1, "required").max(5),
  punctuality: z.coerce.number().int().min(1).max(5).optional(),
  quality: z.coerce.number().int().min(1).max(5).optional(),
  care: z.coerce.number().int().min(1).max(5).optional(),

  comment: z.string().trim().max(600).optional().or(z.literal("")),
});

export type ReviewFormValues = z.input<typeof reviewSchema>;
export type ReviewInput = z.output<typeof reviewSchema>;
