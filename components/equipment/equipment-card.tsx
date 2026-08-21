import { useLocale, useTranslations } from "next-intl";
import { MapPin, Star, UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { STATUS_TONE } from "@/lib/equipment";
import { formatPlace } from "@/lib/locations";
import { formatMNT } from "@/lib/money";
import type {
  EquipmentCategory,
  EquipmentStatus,
} from "@/lib/generated/prisma/enums";
import { EquipmentThumb } from "./equipment-thumb";

export type EquipmentCardData = {
  id: string;
  category: EquipmentCategory;
  make: string;
  model: string;
  year: number;
  status: EquipmentStatus;
  monthlyRate: number;
  dailyRate: number;
  aimag: string;
  district: string | null;
  photos: string[];
  withOperator: boolean;
  ratingAvg: number;
  ratingCount: number;
};

export function EquipmentCard({
  equipment,
  href,
}: {
  equipment: EquipmentCardData;
  href: string;
}) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <Link
      href={href}
      className="card group flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[var(--shadow-raised)]"
    >
      <div className="relative">
        <EquipmentThumb
          category={equipment.category}
          photo={equipment.photos[0]}
          className="aspect-[16/10] w-full"
        />
        <span className="absolute left-3 top-3">
          <Badge tone={STATUS_TONE[equipment.status]} className="bg-surface/95 backdrop-blur">
            {t(`equipment.status.${equipment.status}`)}
          </Badge>
        </span>
        {equipment.withOperator ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-ink-950/65 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
            <UserRound className="size-3" />
            {t("equipment.withOperator")}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-600">
            {t(`equipment.category.${equipment.category}`)}
          </p>
          {equipment.ratingCount > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-bold text-ink-700">
              <Star className="size-3.5 fill-accent-400 text-accent-400" />
              <span className="tabular">{equipment.ratingAvg.toFixed(1)}</span>
              <span className="font-semibold text-ink-400">
                ({equipment.ratingCount})
              </span>
            </span>
          ) : null}
        </div>

        <p className="text-[15px] font-bold leading-snug text-ink-900">
          {equipment.make} {equipment.model}
        </p>

        <p className="inline-flex items-center gap-1.5 text-[13px] text-ink-500">
          <MapPin className="size-3.5 shrink-0 text-ink-400" />
          <span className="truncate">
            {formatPlace(equipment.aimag, equipment.district, locale)}
          </span>
        </p>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <span>
            <span className="block text-[15px] font-extrabold text-ink-900 tabular">
              {formatMNT(equipment.monthlyRate, locale)}
            </span>
            <span className="block text-[11px] font-semibold text-ink-400">
              {t("common.perMonth")}
            </span>
          </span>
          <span className="text-right">
            <span className="block text-[13px] font-bold text-ink-600 tabular">
              {formatMNT(equipment.dailyRate, locale)}
            </span>
            <span className="block text-[11px] font-semibold text-ink-400">
              {t("common.perDay")}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
