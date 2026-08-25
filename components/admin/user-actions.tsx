"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BadgeCheck, Ban, Loader2, RotateCcw, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  setSuspendedAction,
  setVerificationAction,
} from "@/app/[locale]/(dashboard)/admin/actions";
import type { VerificationStatus } from "@/lib/generated/prisma/enums";

/**
 * The decisions available on one account. Which buttons appear is driven by the
 * account's current state — an already-verified user has nothing to approve.
 */
export function UserActions({
  userId,
  verification,
  suspended,
  isSelf,
}: {
  userId: string;
  verification: VerificationStatus;
  suspended: boolean;
  isSelf: boolean;
}) {
  const t = useTranslations("admin.users");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string } | void>) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result && !result.ok) {
        setError(result.error ?? "generic");
        return;
      }
      router.refresh();
    });
  };

  const decide = (next: VerificationStatus) =>
    run(() => setVerificationAction(locale, userId, next));

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {pending ? <Loader2 className="size-4 animate-spin text-ink-400" /> : null}

      {error ? (
        <span className="text-[12px] font-semibold text-critical">
          {t(`errors.${error}`)}
        </span>
      ) : null}

      {verification !== "VERIFIED" ? (
        <Button size="sm" variant="subtle" disabled={pending} onClick={() => decide("VERIFIED")}>
          <BadgeCheck />
          {t("verify")}
        </Button>
      ) : null}

      {verification === "PENDING" ? (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => decide("REJECTED")}>
          <X />
          {t("reject")}
        </Button>
      ) : null}

      {isSelf ? null : suspended ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => setSuspendedAction(locale, userId, false))}
        >
          <RotateCcw />
          {t("reinstate")}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => run(() => setSuspendedAction(locale, userId, true))}
        >
          <Ban />
          {t("suspend")}
        </Button>
      )}
    </div>
  );
}
