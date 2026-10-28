"use client";

import { useTransition } from "react";
import { EyeOff, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { stopImpersonationAction } from "@/lib/admin/impersonation";

/**
 * Always-visible reminder that this is not your account.
 *
 * Deliberately loud and at the very top of every page: the whole risk of
 * impersonation is forgetting you are doing it.
 */
export function ImpersonationBanner({
  subjectName,
  actorName,
}: {
  subjectName: string;
  actorName: string;
}) {
  const t = useTranslations("impersonation");
  const [pending, startTransition] = useTransition();

  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-500 px-4 py-2 text-[13px] font-bold text-amber-950">
      <span className="flex items-center gap-2">
        <EyeOff className="size-4 shrink-0" />
        {t("banner", { subject: subjectName, actor: actorName })}
      </span>

      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => stopImpersonationAction())}
        className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-amber-950/10 px-2.5 py-1 underline-offset-2 transition-colors hover:bg-amber-950/20 disabled:opacity-60"
      >
        <LogOut className="size-3.5" />
        {t("exit")}
      </button>
    </div>
  );
}
