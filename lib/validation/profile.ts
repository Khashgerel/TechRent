import { z } from "zod";

/**
 * The details a client needs on file before they can place an order.
 *
 * Deliberately short: a social sign-in asks for nothing, so this is the first
 * time the person is asked for anything at all, and it happens at the moment
 * it actually matters rather than as a wall in front of the front door.
 */
export const companyProfileSchema = z.object({
  companyName: z.string().trim().min(2, "required").max(120),
  regNumber: z.string().trim().max(20).optional().or(z.literal("")),
  industry: z.string().trim().max(80).optional().or(z.literal("")),
  aimag: z.string().trim().min(1, "required"),
  district: z.string().trim().optional().or(z.literal("")),
  contactName: z.string().trim().min(2, "required").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^\d{8}$/, "invalidPhone"),
});

export type CompanyProfileValues = z.input<typeof companyProfileSchema>;
export type CompanyProfileInput = z.output<typeof companyProfileSchema>;
