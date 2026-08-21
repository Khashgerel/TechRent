import type { EquipmentCategory, EquipmentStatus } from "./generated/prisma/enums";

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  "EXCAVATOR",
  "LOADER",
  "BULLDOZER",
  "CRANE",
  "TRUCK",
  "CONCRETE_MIXER",
  "DRILL_RIG",
  "GRADER",
  "ROLLER",
  "FORKLIFT",
];

export const EQUIPMENT_STATUSES: EquipmentStatus[] = [
  "ACTIVE",
  "MAINTENANCE",
  "INACTIVE",
  "DRAFT",
  "PENDING_REVIEW",
];

/**
 * Each category gets its own gradient so listings stay recognisable at a glance
 * even before an owner uploads a photo.
 */
export const CATEGORY_GRADIENT: Record<EquipmentCategory, [string, string]> = {
  EXCAVATOR: ["#1a56db", "#3b6df6"],
  LOADER: ["#b45309", "#f59e0b"],
  BULLDOZER: ["#065f46", "#10b981"],
  CRANE: ["#7c2d12", "#ea580c"],
  TRUCK: ["#1e3a8a", "#2563eb"],
  CONCRETE_MIXER: ["#334155", "#64748b"],
  DRILL_RIG: ["#581c87", "#9333ea"],
  GRADER: ["#134e4a", "#0d9488"],
  ROLLER: ["#713f12", "#ca8a04"],
  FORKLIFT: ["#9f1239", "#e11d48"],
};

export const STATUS_TONE: Record<
  EquipmentStatus,
  "positive" | "caution" | "critical" | "neutral" | "brand"
> = {
  ACTIVE: "positive",
  MAINTENANCE: "caution",
  INACTIVE: "neutral",
  DRAFT: "neutral",
  PENDING_REVIEW: "brand",
};

export function equipmentName(equipment: { make: string; model: string }) {
  return `${equipment.make} ${equipment.model}`;
}

/**
 * Day rate implied by the monthly price. Owners price months at a discount, so
 * this is what a long booking should actually cost per day.
 */
export function effectiveDailyRate(equipment: {
  dailyRate: number;
  monthlyRate: number;
}, days: number) {
  if (days >= 30) return Math.round(equipment.monthlyRate / 30);
  return equipment.dailyRate;
}

export function quoteFor(
  equipment: { dailyRate: number; monthlyRate: number },
  days: number,
) {
  return effectiveDailyRate(equipment, days) * days;
}
