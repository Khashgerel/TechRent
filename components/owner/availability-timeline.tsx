"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { CATEGORY_ICON } from "@/components/equipment/category-icon";
import { startOfDay, weekdayNarrow } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type {
  BookingStatus,
  EquipmentCategory,
} from "@/lib/generated/prisma/enums";

const DAY_MS = 1000 * 60 * 60 * 24;
const WINDOW_DAYS = 42;
const CELL = 30;

export type TimelineEquipment = {
  id: string;
  make: string;
  model: string;
  category: EquipmentCategory;
};

export type TimelineBooking = {
  id: string;
  equipmentId: string | null;
  startDate: string;
  endDate: string;
  status: BookingStatus;
  title: string;
};

export type TimelineBlock = {
  id: string;
  equipmentId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
};

function dayIndex(from: Date, date: Date) {
  return Math.floor((startOfDay(date).getTime() - from.getTime()) / DAY_MS);
}

/**
 * A scheduling timeline rather than a month grid: one row per machine, so an
 * owner can see at a glance which of their fleet is idle next week — the
 * question the calendar actually exists to answer.
 */
export function AvailabilityTimeline({
  equipment,
  bookings,
  blocks,
}: {
  equipment: TimelineEquipment[];
  bookings: TimelineBooking[];
  blocks: TimelineBlock[];
}) {
  const t = useTranslations("owner.calendar");
  const locale = useLocale();
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<string>("all");

  const start = useMemo(() => {
    const base = startOfDay(new Date());
    base.setDate(base.getDate() + offset * 7);
    return base;
  }, [offset]);

  const days = useMemo(
    () =>
      Array.from({ length: WINDOW_DAYS }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [start],
  );

  const rows = filter === "all" ? equipment : equipment.filter((e) => e.id === filter);
  const today = startOfDay(new Date());

  function barFor(from: string, to: string) {
    const startIdx = dayIndex(start, new Date(from));
    const endIdx = dayIndex(start, new Date(to));
    if (endIdx < 0 || startIdx > WINDOW_DAYS - 1) return null;

    const clampedStart = Math.max(0, startIdx);
    const clampedEnd = Math.min(WINDOW_DAYS - 1, endIdx);
    return {
      left: clampedStart * CELL,
      width: Math.max(CELL * 0.7, (clampedEnd - clampedStart + 1) * CELL - 4),
    };
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-ink-200/70 px-4 py-3">
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-9 w-auto min-w-52"
        >
          <option value="all">{t("allEquipment")}</option>
          {equipment.map((item) => (
            <option key={item.id} value={item.id}>
              {item.make} {item.model}
            </option>
          ))}
        </Select>

        <div className="ml-auto flex items-center gap-3">
          <Legend swatch="bg-brand-600" label={t("booked")} />
          <Legend swatch="bg-caution" label={t("blocked")} />

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              onClick={() => setOffset((o) => o - 1)}
              aria-label="Previous week"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              onClick={() => setOffset(0)}
            >
              •
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              onClick={() => setOffset((o) => o + 1)}
              aria-label="Next week"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <div style={{ minWidth: 200 + WINDOW_DAYS * CELL }}>
          {/* Date header */}
          <div className="flex border-b border-ink-200/70 bg-surface-muted">
            <div className="w-50 shrink-0 px-4 py-2" style={{ width: 200 }} />
            <div className="flex">
              {days.map((day) => {
                const isToday = day.getTime() === today.getTime();
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const isMonthStart = day.getDate() === 1;

                return (
                  <div
                    key={day.toISOString()}
                    style={{ width: CELL }}
                    className={cn(
                      "shrink-0 border-l py-1.5 text-center",
                      isMonthStart ? "border-ink-300" : "border-ink-200/50",
                      isWeekend && "bg-ink-100/60",
                    )}
                  >
                    <div className="text-[9px] font-semibold uppercase text-ink-400">
                      {weekdayNarrow(day, locale)}
                    </div>
                    <div
                      className={cn(
                        "text-[11px] font-bold tabular",
                        isToday ? "text-brand-600" : "text-ink-600",
                      )}
                    >
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {rows.map((item) => {
            const Icon = CATEGORY_ICON[item.category];
            const itemBookings = bookings.filter((b) => b.equipmentId === item.id);
            const itemBlocks = blocks.filter((b) => b.equipmentId === item.id);

            return (
              <div
                key={item.id}
                className="flex border-b border-ink-200/70 last:border-0"
              >
                <div
                  style={{ width: 200 }}
                  className="flex shrink-0 items-center gap-2 px-4 py-3"
                >
                  <Icon className="size-4 shrink-0 text-ink-400" />
                  <span className="truncate text-[13px] font-semibold text-ink-800">
                    {item.make} {item.model}
                  </span>
                </div>

                <div className="relative flex-1" style={{ height: 48 }}>
                  {/* Day gridlines */}
                  <div className="absolute inset-0 flex">
                    {days.map((day) => (
                      <div
                        key={day.toISOString()}
                        style={{ width: CELL }}
                        className={cn(
                          "shrink-0 border-l border-ink-200/50",
                          (day.getDay() === 0 || day.getDay() === 6) &&
                            "bg-ink-100/50",
                        )}
                      />
                    ))}
                  </div>

                  {itemBlocks.map((block) => {
                    const bar = barFor(block.startDate, block.endDate);
                    if (!bar) return null;
                    return (
                      <div
                        key={block.id}
                        title={block.reason ?? t("blocked")}
                        className="absolute top-[26px] h-3 rounded-full bg-caution/80"
                        style={{ left: bar.left + 2, width: bar.width }}
                      />
                    );
                  })}

                  {itemBookings.map((booking) => {
                    const bar = barFor(booking.startDate, booking.endDate);
                    if (!bar) return null;
                    return (
                      <div
                        key={booking.id}
                        title={booking.title}
                        className={cn(
                          "absolute top-2 flex h-4 items-center overflow-hidden rounded-full px-2",
                          booking.status === "IN_PROGRESS"
                            ? "bg-brand-600"
                            : booking.status === "CONFIRMED"
                              ? "bg-brand-400"
                              : "bg-ink-400",
                        )}
                        style={{ left: bar.left + 2, width: bar.width }}
                      >
                        <span className="truncate text-[10px] font-bold text-white">
                          {booking.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-ink-500">
              {t("noBlocks")}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-600">
      <span className={cn("size-2.5 rounded-full", swatch)} />
      {label}
    </span>
  );
}
