import type { EquipmentCategory, PartCategory } from "../generated/prisma/enums";

export const PART_CATEGORIES: PartCategory[] = [
  "FILTER",
  "HYDRAULICS",
  "UNDERCARRIAGE",
  "ENGINE",
  "ELECTRICAL",
  "TIRES",
  "ATTACHMENTS",
  "CONSUMABLES",
];

/**
 * Parts have no photography in the demo, so each category carries its own
 * gradient — the same trick the equipment listings use to stay recognisable at
 * a glance.
 */
export const PART_GRADIENT: Record<PartCategory, [string, string]> = {
  FILTER: ["#1a56db", "#3b6df6"],
  HYDRAULICS: ["#0f766e", "#14b8a6"],
  UNDERCARRIAGE: ["#334155", "#64748b"],
  ENGINE: ["#7c2d12", "#ea580c"],
  ELECTRICAL: ["#581c87", "#9333ea"],
  TIRES: ["#1f2937", "#4b5563"],
  ATTACHMENTS: ["#b45309", "#f59e0b"],
  CONSUMABLES: ["#065f46", "#10b981"],
};

/** Below this a part is still sellable, but the card warns the buyer. */
export const LOW_STOCK_AT = 5;

/** Anything more than this in one line is a wholesale order, not a demo cart. */
export const MAX_LINE_QUANTITY = 99;

export const MAX_CART_LINES = 20;

export function partName(
  part: { nameMn: string; nameEn: string },
  locale: string,
) {
  return locale === "en" ? part.nameEn : part.nameMn;
}

export function partDescription(
  part: { descriptionMn: string | null; descriptionEn: string | null },
  locale: string,
) {
  return (locale === "en" ? part.descriptionEn : part.descriptionMn) ?? null;
}

export function fitsCategory(
  part: { compatibleWith: EquipmentCategory[] },
  category: EquipmentCategory,
) {
  // An empty compatibility list means universal — oils, grease, gloves.
  return part.compatibleWith.length === 0 || part.compatibleWith.includes(category);
}
