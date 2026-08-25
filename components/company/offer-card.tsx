"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarCheck,
  ChevronDown,
  MapPin,
  Star,
  UserRound,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EquipmentThumb } from "@/components/equipment/equipment-thumb";
import { SEQUENTIAL } from "@/lib/chart-palette";
import { formatPlace } from "@/lib/locations";
import { formatMNT } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { EquipmentCategory } from "@/lib/generated/prisma/enums";
import {
  acceptMatchAction,
  declineMatchAction,
} from "@/app/[locale]/(dashboard)/company/orders/actions";

export type OfferFactor = {
  key: "distance" | "price" | "rating" | "operator" | "readiness";
  score: number;
  weight: number;
  detail: Record<string, string | number | boolean>;
};

export type Offer = {
  id: string;
  status: string;
  score: number;
  distanceKm: number;
  quotedAmount: number;
  days: number;
  factors: OfferFactor[];
  equipment: {
    id: string;
    category: EquipmentCategory;
    make: string;
    model: string;
    aimag: string;
    district: string | null;
    photos: string[];
    ratingAvg: number;
    ratingCount: number;
    ownerName: string;
  } | null;
  operatorName: string | null;
  operatorLevel: string | null;
};

/** A ring reads as a score at a glance in a way a bare number does not. */
function ScoreRing({ score }: { score: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  const colour =
    SEQUENTIAL[Math.min(SEQUENTIAL.length - 1, Math.floor((score / 100) * SEQUENTIAL.length))];

  return (
    <div className="relative size-16 shrink-0">
      <svg viewBox="0 0 64 64" className="size-full -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="var(--color-ink-200)"
          strokeWidth="6"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={colour}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[15px] font-extrabold text-ink-900 tabular">
        {score}
      </span>
    </div>
  );
}

const FACTOR_ICON = {
  distance: MapPin,
  price: Wallet,
  rating: Star,
  operator: UserRound,
  readiness: CalendarCheck,
} as const;

export function OfferCard({ offer }: { offer: Offer }) {
  const t = useTranslations();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!offer.equipment) return null;

  const decided = offer.status !== "SUGGESTED";
  const accepted = offer.status === "ACCEPTED";

  /** Turns a factor's raw numbers into the sentence a person would say. */
  function reasonFor(factor: OfferFactor) {
    switch (factor.key) {
      case "distance":
        return t("match.reasons.distance", { km: Number(factor.detail.km ?? 0) });
      case "price":
        return factor.detail.overBudget
          ? t("match.reasons.priceOver", {
              percent: Number(factor.detail.percentOfBudget ?? 100) - 100,
            })
          : t("match.reasons.priceWithin", {
              percent: Number(factor.detail.percentOfBudget ?? 0),
            });
      case "rating":
        return t("match.reasons.rating", {
          rating: Number(factor.detail.rating ?? 0),
          reviews: Number(factor.detail.reviews ?? 0),
        });
      case "operator":
        return factor.detail.certified
          ? t("match.reasons.operatorCertified", {
              level: t(`operatorLevel.${String(factor.detail.level || "BEGINNER")}`),
            })
          : t("match.reasons.operatorNone");
      case "readiness":
        return Number(factor.detail.conflicts ?? 0) === 0
          ? t("match.reasons.readinessClear")
          : t("match.reasons.readinessTight", {
              conflicts: Number(factor.detail.conflicts),
            });
    }
  }

  const visibleFactors = offer.factors.filter((f) => f.weight > 0);

  return (
    <div
      className={cn(
        "card overflow-hidden transition-colors",
        accepted && "border-positive/40 ring-1 ring-positive/20",
        offer.status === "DECLINED" && "opacity-55",
      )}
    >
      <div className="flex gap-4 p-4">
        <EquipmentThumb
          category={offer.equipment.category}
          photo={offer.equipment.photos[0]}
          className="size-20 shrink-0 rounded-[12px]"
          iconClassName="size-7"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-brand-600">
                {t(`equipment.category.${offer.equipment.category}`)}
              </p>
              <p className="truncate text-[15px] font-bold text-ink-900">
                {offer.equipment.make} {offer.equipment.model}
              </p>
              <p className="truncate text-[12px] text-ink-500">
                {offer.equipment.ownerName} ·{" "}
                {formatPlace(offer.equipment.aimag, offer.equipment.district, locale)}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-center gap-1">
              <ScoreRing score={offer.score} />
              <span className="text-[10px] font-bold uppercase tracking-wide text-ink-400">
                {t("company.offers.matchScore")}
              </span>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="text-[15px] font-extrabold text-ink-900 tabular">
              {formatMNT(offer.quotedAmount, locale)}
            </span>
            <span className="text-[12px] font-semibold text-ink-500">
              {t("company.offers.forDays", { days: offer.days })}
            </span>
            {offer.operatorName ? (
              <Badge tone="brand">
                <UserRound className="size-3" />
                {offer.operatorName}
              </Badge>
            ) : (
              <Badge tone="neutral">{t("company.offers.noOperator")}</Badge>
            )}
            {decided ? (
              <Badge tone={accepted ? "positive" : "neutral"}>
                {accepted
                  ? t("company.offers.accepted")
                  : t("company.offers.declined")}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 border-t border-ink-200/70 px-4 py-2.5 text-left text-[13px] font-bold text-brand-600 transition-colors hover:bg-brand-50/60"
      >
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
        />
        {t("company.offers.whyMatch")}
      </button>

      {open ? (
        <div className="border-t border-ink-200/70 bg-surface-muted px-4 py-3">
          <ul className="flex flex-col gap-2.5">
            {visibleFactors.map((factor) => {
              const Icon = FACTOR_ICON[factor.key];
              return (
                <li key={factor.key} className="flex items-center gap-3">
                  <Icon className="size-4 shrink-0 text-ink-400" />
                  <span className="w-24 shrink-0 text-[12px] font-bold text-ink-700">
                    {t(`match.factors.${factor.key}`)}
                  </span>
                  <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-ink-200">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
                      style={{ width: `${Math.max(2, factor.score)}%` }}
                    />
                  </span>
                  <span className="w-44 shrink-0 text-right text-[12px] text-ink-600">
                    {reasonFor(factor)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {!decided ? (
        <div className="flex items-center gap-2 border-t border-ink-200/70 px-4 py-3">
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await acceptMatchAction(locale, offer.id);
              })
            }
          >
            {t("company.offers.accept")}
          </Button>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await declineMatchAction(locale, offer.id);
              })
            }
          >
            {t("company.offers.decline")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
