"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { setAvailabilityAction } from "@/lib/operator/actions";
import { cn } from "@/lib/utils";

export function AvailabilityToggle({ available }: { available: boolean }) {
  const t = useTranslations("operator");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold",
          available ? "bg-positive-soft text-positive" : "bg-ink-100 text-ink-500",
        )}
      >
        <span
          className={cn(
            "size-2 rounded-full",
            available ? "bg-positive" : "bg-ink-400",
          )}
        />
        {available ? t("available") : t("unavailable")}
      </span>

      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await setAvailabilityAction(locale, !available);
            router.refresh();
          })
        }
      >
        {t("toggleAvailability")}
      </Button>
    </div>
  );
}
