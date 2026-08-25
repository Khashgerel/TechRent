"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rerunMatchingAction } from "@/app/[locale]/(dashboard)/company/orders/actions";

export function RerunButton({ orderId }: { orderId: string }) {
  const t = useTranslations("company.offers");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await rerunMatchingAction(locale, orderId);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      {t("rerun")}
    </Button>
  );
}
