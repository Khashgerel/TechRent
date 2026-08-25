import { z } from "zod";
import { EQUIPMENT_CATEGORIES } from "@/lib/equipment";
import { MAX_CART_LINES, MAX_LINE_QUANTITY } from "@/lib/store/catalog";

export const cartItemSchema = z.object({
  partId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(MAX_LINE_QUANTITY),
});

export const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1, "emptyCart").max(MAX_CART_LINES),
  address: z.string().trim().min(5, "required").max(200),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CheckoutInput = z.output<typeof checkoutSchema>;

export const serviceRequestSchema = z.object({
  category: z.enum(EQUIPMENT_CATEGORIES as [string, ...string[]]),
  equipmentId: z.string().optional().or(z.literal("")),
  description: z.string().trim().min(10, "required").max(1000),
  // Optional: a request with no preferred date is just "whenever you can".
  preferredAt: z.coerce.date().optional().or(z.literal("")),
});

export type ServiceRequestFormValues = z.input<typeof serviceRequestSchema>;
export type ServiceRequestInput = z.output<typeof serviceRequestSchema>;
