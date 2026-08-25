"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCheck } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { markNotificationsReadAction } from "@/lib/bookings/actions";

export function MarkAllReadButton() {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markNotificationsReadAction(locale);
          router.refresh();
        })
      }
    >
      <CheckCheck />
      {t("markAllRead")}
    </Button>
  );
}
