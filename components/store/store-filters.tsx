"use client";

import { useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { EQUIPMENT_CATEGORIES } from "@/lib/equipment";
import { PART_CATEGORIES } from "@/lib/store/catalog";

/** Same contract as the equipment search: filters live in the URL, not state. */
export function StoreFilters() {
  const t = useTranslations("store");
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

  const hasFilters = [...params.keys()].length > 0;

  return (
    <div className="card mb-4 p-4">
      <form
        className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          apply({ q: String(data.get("q") ?? "") });
        }}
      >
        <Field className="xl:col-span-2" label={tc("common.search")}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
            <Input
              name="q"
              defaultValue={get("q")}
              placeholder={t("searchPlaceholder")}
              className="pl-9"
            />
          </div>
        </Field>

        <Field label={t("partCategoryLabel")}>
          <Select
            value={get("category")}
            onChange={(e) => apply({ category: e.target.value })}
          >
            <option value="">{tc("common.all")}</option>
            {PART_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {t(`partCategory.${category}`)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t("fits")} hint={t("fitsHint")}>
          <Select value={get("fits")} onChange={(e) => apply({ fits: e.target.value })}>
            <option value="">{tc("common.all")}</option>
            {EQUIPMENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {tc(`equipment.category.${category}`)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t("sort")}>
          <Select
            value={get("sort") || "relevance"}
            onChange={(e) => apply({ sort: e.target.value })}
          >
            <option value="relevance">{t("sortRelevance")}</option>
            <option value="priceAsc">{t("sortPriceAsc")}</option>
            <option value="priceDesc">{t("sortPriceDesc")}</option>
            <option value="name">{t("sortName")}</option>
          </Select>
        </Field>

        <div className="flex items-end gap-2 xl:col-span-3">
          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-ink-200 px-3 text-[13px] font-semibold text-ink-700">
            <input
              type="checkbox"
              className="size-4 accent-[var(--color-brand-600)]"
              checked={get("stock") === "1"}
              onChange={(e) => apply({ stock: e.target.checked ? "1" : "" })}
            />
            {t("inStockOnly")}
          </label>

          <Button type="submit" disabled={pending}>
            <Search />
            {tc("common.search")}
          </Button>

          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                startTransition(() => {
                  router.replace(pathname);
                })
              }
            >
              <X />
              {t("reset")}
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
