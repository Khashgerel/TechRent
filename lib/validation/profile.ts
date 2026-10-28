import { z } from "zod";
import { EQUIPMENT_CATEGORIES } from "@/lib/equipment";

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

/**
 * Becoming an equipment owner.
 *
 * Deliberately short, and deliberately without documents: identity and
 * registration checks are A03 in the requirements, and there is no upload
 * mechanism yet. Saving this grants the role and leaves the account
 * unverified, which is what holds the first machine in review.
 */
export const ownerProfileSchema = z.object({
  companyName: z.string().trim().min(2, "required").max(120),
  regNumber: z.string().trim().max(20).optional().or(z.literal("")),
  aimag: z.string().trim().min(1, "required"),
  district: z.string().trim().optional().or(z.literal("")),
  bio: z.string().trim().max(600).optional().or(z.literal("")),
});

export type OwnerProfileValues = z.input<typeof ownerProfileSchema>;
export type OwnerProfileInput = z.output<typeof ownerProfileSchema>;

/**
 * Becoming an operator.
 *
 * `skills` is what the matching engine gates on, so an operator who claims no
 * categories would never be offered work — hence at least one.
 */
export const operatorProfileSchema = z.object({
  yearsExperience: z.coerce.number().int().min(0).max(60),
  skills: z
    .array(z.enum(EQUIPMENT_CATEGORIES as [string, ...string[]]))
    .min(1, "pickOneCategory"),
  aimag: z.string().trim().min(1, "required"),
  district: z.string().trim().optional().or(z.literal("")),
  dailyRate: z.coerce.number().int().min(10_000).max(10_000_000),
  available: z.boolean(),
  bio: z.string().trim().max(600).optional().or(z.literal("")),
});

export type OperatorProfileValues = z.input<typeof operatorProfileSchema>;
export type OperatorProfileInput = z.output<typeof operatorProfileSchema>;
