import {
  Construction,
  Container,
  Cylinder,
  Drill,
  Forklift,
  type LucideIcon,
  Shovel,
  Tractor,
  Truck,
  Waves,
} from "lucide-react";
import type { EquipmentCategory } from "@/lib/generated/prisma/enums";

export const CATEGORY_ICON: Record<EquipmentCategory, LucideIcon> = {
  EXCAVATOR: Shovel,
  LOADER: Forklift,
  BULLDOZER: Tractor,
  CRANE: Construction,
  TRUCK: Truck,
  CONCRETE_MIXER: Container,
  DRILL_RIG: Drill,
  GRADER: Waves,
  ROLLER: Cylinder,
  FORKLIFT: Forklift,
};
