"use client";

import { useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import type { TransactionType } from "@/lib/generated/prisma/enums";

const TYPES: TransactionType[] = [
  "DEPOSIT_HOLD",
  "BALANCE_HOLD",
  "RELEASE",
  "REFUND",
  "TOPUP",
  "WITHDRAWAL",
  "STORE_PURCHASE",
];

export function LedgerFilters({
  months,
  counts,
}: {
  /** Month keys ("2026-08"), newest first. */
  months: string[];
  counts: Partial<Record<TransactionType, number>>;
}) {
  const t = useTranslations("admin.ledger");
  const tc = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const get = (key: string) => params.get(key) ?? "";

  function apply(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`);
    });
  }

  return (
    <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
      <Field label={t("type")} className="min-w-52">
        <Select value={get("type")} onChange={(e) => apply({ type: e.target.value })}>
          <option value="">{tc("common.all")}</option>
          {TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`types.${type}`)}
              {counts[type] ? ` (${counts[type]})` : ""}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={t("month")} className="min-w-40">
        <Select value={get("month")} onChange={(e) => apply({ month: e.target.value })}>
          <option value="">{t("allTime")}</option>
          {months.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </Select>
      </Field>

      {[...params.keys()].length ? (
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => startTransition(() => router.replace(pathname))}
        >
          <X />
          {t("reset")}
        </Button>
      ) : null}
    </div>
  );
}
