import { cn } from "@/lib/utils";
import { CATEGORY_GRADIENT } from "@/lib/equipment";
import type { EquipmentCategory } from "@/lib/generated/prisma/enums";
import { CATEGORY_ICON } from "./category-icon";

/**
 * Shows the first uploaded photo when there is one, and otherwise a
 * category-coloured tile — so a fresh listing never looks broken.
 */
export function EquipmentThumb({
  category,
  photo,
  className,
  iconClassName,
}: {
  category: EquipmentCategory;
  photo?: string | null;
  className?: string;
  iconClassName?: string;
}) {
  const [from, to] = CATEGORY_GRADIENT[category];
  const Icon = CATEGORY_ICON[category];

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-ink-100",
        className,
      )}
      style={
        photo ? undefined : { backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }
      }
    >
      {photo ? (
        // Photos are user-uploaded data URLs, so next/image would add nothing.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="size-full object-cover" />
      ) : (
        <Icon className={cn("size-10 text-white/85", iconClassName)} strokeWidth={1.5} />
      )}
    </div>
  );
}
