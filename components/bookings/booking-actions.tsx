"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { fireBookingEventAction } from "@/lib/bookings/actions";
import type { BookingEvent } from "@/lib/escrow/booking";

/**
 * Renders only the moves this viewer can actually make. The destructive one is
 * separated and asks for a second click, since cancelling moves money.
 */
export function BookingActions({
  bookingId,
  events,
}: {
  bookingId: string;
  events: BookingEvent[];
}) {
  const t = useTranslations("booking");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [armedCancel, setArmedCancel] = useState(false);

  if (events.length === 0) return null;

  const primary = events.filter((e) => e !== "CANCEL");
  const canCancel = events.includes("CANCEL");

  function fire(event: BookingEvent) {
    setError(null);
    startTransition(async () => {
      const result = await fireBookingEventAction(locale, bookingId, event);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <Alert tone="critical">{t(`errors.${error}`)}</Alert> : null}

      {primary.map((event) => (
        <div key={event}>
          <Button full disabled={pending} onClick={() => fire(event)}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {t(`actions.${event}`)}
          </Button>
          <p className="mt-1.5 text-center text-[12px] text-ink-500">
            {t(`actionHints.${event}`)}
          </p>
        </div>
      ))}

      {canCancel ? (
        armedCancel ? (
          <div className="flex flex-col gap-2 rounded-[var(--radius-control)] border border-critical/25 bg-critical-soft p-3">
            <p className="text-[12px] font-semibold text-critical">
              {t("actionHints.CANCEL")}
            </p>
            <div className="flex gap-2">
              <Button
                variant="danger"
                size="sm"
                disabled={pending}
                onClick={() => fire("CANCEL")}
              >
                {t("actions.CANCEL")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setArmedCancel(false)}
              >
                ✕
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setArmedCancel(true)}
            className="text-ink-500"
          >
            {t("actions.CANCEL")}
          </Button>
        )
      ) : null}
    </div>
  );
}
