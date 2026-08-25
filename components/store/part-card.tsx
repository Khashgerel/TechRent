"use client";

import { useLocale, useTranslations } from "next-intl";
import { Cog, Minus, Plus, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMNT } from "@/lib/money";
import {
  LOW_STOCK_AT,
  MAX_LINE_QUANTITY,
  PART_GRADIENT,
  partDescription,
  partName,
} from "@/lib/store/catalog";
import type { EquipmentCategory, PartCategory } from "@/lib/generated/prisma/enums";

export type PartCardData = {
  id: string;
  sku: string;
  nameMn: string;
  nameEn: string;
  descriptionMn: string | null;
  descriptionEn: string | null;
  category: PartCategory;
  price: number;
  stock: number;
  unit: string;
  compatibleWith: EquipmentCategory[];
};

export function PartCard({
  part,
  quantity,
  onAdd,
  onSetQuantity,
}: {
  part: PartCardData;
  /** How many of this part are already in the cart. */
  quantity: number;
  onAdd: (partId: string) => void;
  onSetQuantity: (partId: string, quantity: number) => void;
}) {
  const t = useTranslations("store");
  const tc = useTranslations();
  const locale = useLocale();

  const [from, to] = PART_GRADIENT[part.category];
  const description = partDescription(part, locale);
  // Units are stored as codes and translated here, the same way notifications
  // are — an unknown code falls back to whatever the row holds.
  const unit = t.has(`unit.${part.unit}`) ? t(`unit.${part.unit}`) : part.unit;
  const soldOut = part.stock === 0;
  const atStockLimit = quantity >= part.stock;

  return (
    <div className="card flex flex-col overflow-hidden">
      <div
        className="relative flex h-20 items-end px-4 pb-3"
        style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
      >
        <Cog className="absolute right-3 top-3 size-6 text-white/40" />
        <Badge tone="neutral" className="bg-white/90 backdrop-blur">
          {t(`partCategory.${part.category}`)}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <p className="text-[15px] font-bold leading-snug text-ink-900">
            {partName(part, locale)}
          </p>
          <p className="mt-0.5 text-[12px] font-semibold text-ink-400 tabular">
            {part.sku}
          </p>
        </div>

        {description ? (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-ink-500">
            {description}
          </p>
        ) : null}

        <p className="text-[12px] text-ink-500">
          {part.compatibleWith.length === 0
            ? t("universalFit")
            : part.compatibleWith
                .map((category) => tc(`equipment.category.${category}`))
                .join(", ")}
        </p>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <p className="text-[17px] font-extrabold tracking-tight text-ink-900 tabular">
              {formatMNT(part.price, locale)}
            </p>
            <p className="text-[12px] font-semibold text-ink-400">
              {soldOut
                ? t("soldOut")
                : part.stock <= LOW_STOCK_AT
                  ? t("lowStock", { count: part.stock })
                  : t("inStock", { count: part.stock, unit })}
            </p>
          </div>

          {quantity > 0 ? (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                aria-label={t("decrease")}
                onClick={() => onSetQuantity(part.id, quantity - 1)}
              >
                <Minus />
              </Button>
              <span className="w-8 text-center text-[14px] font-extrabold text-ink-900 tabular">
                {quantity}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                aria-label={t("increase")}
                disabled={atStockLimit || quantity >= MAX_LINE_QUANTITY}
                onClick={() => onSetQuantity(part.id, quantity + 1)}
              >
                <Plus />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant={soldOut ? "outline" : "primary"}
              disabled={soldOut}
              onClick={() => onAdd(part.id)}
            >
              <ShoppingCart />
              {t("add")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
