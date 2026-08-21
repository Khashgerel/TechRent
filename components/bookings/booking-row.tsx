import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EquipmentThumb } from "@/components/equipment/equipment-thumb";
import { formatRange } from "@/lib/dates";
import { formatMNT } from "@/lib/money";
import type {
  BookingStatus,
  EquipmentCategory,
} from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

export const BOOKING_TONE: Record<
  BookingStatus,
  "neutral" | "brand" | "positive" | "caution" | "critical"
> = {
  PENDING: "caution",
  CONFIRMED: "brand",
  IN_PROGRESS: "brand",
  COMPLETED: "positive",
  VERIFIED: "positive",
  PAID: "positive",
  CANCELLED: "critical",
};

export type BookingRowData = {
  id: string;
  status: BookingStatus;
  startDate: Date;
  endDate: Date;
  totalAmount: number;
  /** What this viewer takes home; omit to show the gross amount only. */
  payout?: number;
  title: string;
  counterparty: string;
  operatorName?: string | null;
  category: EquipmentCategory;
  equipmentName?: string | null;
  photo?: string | null;
};

export function BookingRow({
  booking,
  className,
}: {
  booking: BookingRowData;
  className?: string;
}) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <div
      className={cn(
        "flex items-center gap-3.5 border-b border-ink-200/70 px-4 py-3 last:border-0",
        className,
      )}
    >
      <EquipmentThumb
        category={booking.category}
        photo={booking.photo}
        className="size-12 shrink-0 rounded-[10px]"
        iconClassName="size-5"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold text-ink-900">
          {booking.title}
        </p>
        <p className="truncate text-[12px] text-ink-500">
          {booking.counterparty}
          {booking.equipmentName ? ` · ${booking.equipmentName}` : ""}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-ink-400">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3" />
            {formatRange(booking.startDate, booking.endDate, locale)}
          </span>
          {booking.operatorName ? (
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3" />
              {booking.operatorName}
            </span>
          ) : null}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[14px] font-extrabold text-ink-900 tabular">
          {formatMNT(booking.payout ?? booking.totalAmount, locale)}
        </p>
        <Badge tone={BOOKING_TONE[booking.status]} className="mt-1">
          {t(`bookingStatus.${booking.status}`)}
        </Badge>
      </div>
    </div>
  );
}
