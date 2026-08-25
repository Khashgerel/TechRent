"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  setServiceRequestStatusAction,
  setStoreOrderStatusAction,
} from "@/app/[locale]/(dashboard)/admin/actions";
import { nextOrderStatuses, nextRequestStatuses } from "@/lib/admin/flow";
import type {
  ServiceRequestStatus,
  StoreOrderStatus,
} from "@/lib/generated/prisma/enums";

/**
 * One button per legal next status, read from the same flow table the action
 * enforces — the console can only offer moves the server would accept.
 * Cancelling a paid order refunds the buyer, so it asks first.
 */
export function OrderStatusActions({
  orderId,
  status,
}: {
  orderId: string;
  status: StoreOrderStatus;
}) {
  const t = useTranslations("admin.store");
  const ts = useTranslations("store.orderStatus");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [armed, setArmed] = useState<StoreOrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const options = nextOrderStatuses(status);
  if (options.length === 0) return null;

  const apply = (next: StoreOrderStatus) => {
    setError(null);
    startTransition(async () => {
      const result = await setStoreOrderStatusAction(locale, orderId, next);
      setArmed(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pending ? <Loader2 className="size-4 animate-spin text-ink-400" /> : null}
      {error ? (
        <span className="text-[12px] font-semibold text-critical">
          {t(`errors.${error}`)}
        </span>
      ) : null}

      {options.map((option) => {
        const refunds = option === "CANCELLED" && status === "PAID";

        if (refunds && armed === option) {
          return (
            <span key={option} className="inline-flex items-center gap-2">
              <span className="text-[12px] font-semibold text-ink-600">
                {t("refundWarning")}
              </span>
              <Button
                size="sm"
                variant="danger"
                disabled={pending}
                onClick={() => apply(option)}
              >
                {t("refundConfirm")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setArmed(null)}>
                {t("cancelAction")}
              </Button>
            </span>
          );
        }

        return (
          <Button
            key={option}
            size="sm"
            variant={option === "CANCELLED" ? "ghost" : "subtle"}
            disabled={pending}
            onClick={() => (refunds ? setArmed(option) : apply(option))}
          >
            {ts(option)}
          </Button>
        );
      })}
    </div>
  );
}

export function RequestStatusActions({
  requestId,
  status,
}: {
  requestId: string;
  status: ServiceRequestStatus;
}) {
  const t = useTranslations("admin.store");
  const ts = useTranslations("store.serviceStatus");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const options = nextRequestStatuses(status);
  if (options.length === 0) return null;

  const apply = (next: ServiceRequestStatus) => {
    setError(null);
    startTransition(async () => {
      const result = await setServiceRequestStatusAction(locale, requestId, next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pending ? <Loader2 className="size-4 animate-spin text-ink-400" /> : null}
      {error ? (
        <span className="text-[12px] font-semibold text-critical">
          {t(`errors.${error}`)}
        </span>
      ) : null}

      {options.map((option) => (
        <Button
          key={option}
          size="sm"
          variant={option === "CANCELLED" ? "ghost" : "subtle"}
          disabled={pending}
          onClick={() => apply(option)}
        >
          {ts(option)}
        </Button>
      ))}
    </div>
  );
}
