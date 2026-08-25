import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/lib/generated/prisma/enums";

const STEPS: BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "PAID",
];

/** Where the booking sits on the path from accepted offer to money released. */
export function BookingTimeline({ status }: { status: BookingStatus }) {
  const t = useTranslations("booking");

  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-2.5 rounded-[var(--radius-control)] border border-critical/25 bg-critical-soft px-4 py-3">
        <X className="size-4 text-critical" />
        <span className="text-[13px] font-bold text-critical">
          {t("actions.CANCEL")}
        </span>
      </div>
    );
  }

  const current = STEPS.indexOf(status);

  return (
    <ol className="flex items-center">
      {STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;

        return (
          <li key={step} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-colors",
                  done && "border-positive bg-positive text-white",
                  active && "border-brand-600 bg-brand-600 text-white",
                  !done && !active && "border-ink-200 bg-surface text-ink-400",
                )}
              >
                {done ? <Check className="size-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-[11px] font-bold",
                  active ? "text-ink-900" : "text-ink-400",
                )}
              >
                {t(`steps.${step}`)}
              </span>
            </div>

            {index < STEPS.length - 1 ? (
              <span
                className={cn(
                  "mx-1 mb-5 h-0.5 flex-1 rounded-full",
                  index < current ? "bg-positive" : "bg-ink-200",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
