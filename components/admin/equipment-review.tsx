"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BadgeCheck, Loader2, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { reviewEquipmentAction } from "@/app/[locale]/(dashboard)/admin/actions";

export function EquipmentReview({ equipmentId }: { equipmentId: string }) {
  const t = useTranslations("admin.equipment");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const decide = (decision: "ACTIVE" | "INACTIVE") => {
    setError(null);
    startTransition(async () => {
      const result = await reviewEquipmentAction(locale, equipmentId, decision);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {pending ? <Loader2 className="size-4 animate-spin text-ink-400" /> : null}
      {error ? (
        <span className="text-[12px] font-semibold text-critical">
          {t(`errors.${error}`)}
        </span>
      ) : null}

      <Button size="sm" variant="subtle" disabled={pending} onClick={() => decide("ACTIVE")}>
        <BadgeCheck />
        {t("approve")}
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => decide("INACTIVE")}>
        <X />
        {t("reject")}
      </Button>
    </div>
  );
}
