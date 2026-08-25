"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { updatePartAction } from "@/app/[locale]/(dashboard)/admin/actions";

/**
 * Inline stock and price editing: the row is the form. Save only lights up once
 * something actually changed, so a long inventory list stays quiet.
 */
export function PartEditor({
  partId,
  price,
  stock,
  active,
}: {
  partId: string;
  price: number;
  stock: number;
  active: boolean;
}) {
  const t = useTranslations("admin.store");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [nextPrice, setPrice] = useState(String(price));
  const [nextStock, setStock] = useState(String(stock));
  const [nextActive, setActive] = useState(active);
  const [error, setError] = useState(false);

  const dirty =
    Number(nextPrice) !== price ||
    Number(nextStock) !== stock ||
    nextActive !== active;

  const save = () => {
    setError(false);
    startTransition(async () => {
      const result = await updatePartAction(locale, partId, {
        price: Number(nextPrice),
        stock: Number(nextStock),
        active: nextActive,
      });

      if (!result.ok) {
        setError(true);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Input
        type="number"
        aria-label={t("price")}
        value={nextPrice}
        onChange={(e) => setPrice(e.target.value)}
        className="h-9 w-32 tabular"
      />
      <Input
        type="number"
        aria-label={t("stock")}
        value={nextStock}
        onChange={(e) => setStock(e.target.value)}
        className="h-9 w-24 tabular"
      />

      <label className="flex h-9 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-ink-200 px-3 text-[12px] font-semibold text-ink-700">
        <input
          type="checkbox"
          className="size-4 accent-[var(--color-brand-600)]"
          checked={nextActive}
          onChange={(e) => setActive(e.target.checked)}
        />
        {t("listed")}
      </label>

      <Button size="sm" disabled={!dirty || pending} onClick={save}>
        {pending ? <Loader2 className="animate-spin" /> : <Check />}
        {t("save")}
      </Button>

      {error ? (
        <span className="text-[12px] font-semibold text-critical">
          {t("saveFailed")}
        </span>
      ) : null}
    </div>
  );
}
