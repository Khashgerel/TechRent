"use client";

import { useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { EQUIPMENT_CATEGORIES } from "@/lib/equipment";
import { AIMAGS } from "@/lib/locations";

/**
 * Filters live in the URL rather than component state, so a search can be
 * shared, bookmarked, and survives a refresh — and the server does the work.
 */
export function SearchFilters() {
  const t = useTranslations("company.search");
  const tc = useTranslations();
  const locale = useLocale();
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

  const hasFilters = [...params.keys()].some((k) => k !== "view");

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
              placeholder={t("queryPlaceholder")}
              className="pl-9"
            />
          </div>
        </Field>

        <Field label={t("sort")}>
          <Select
            value={get("sort") || "relevance"}
            onChange={(e) => apply({ sort: e.target.value })}
          >
            <option value="relevance">{t("sortRelevance")}</option>
            <option value="priceAsc">{t("sortPriceAsc")}</option>
            <option value="priceDesc">{t("sortPriceDesc")}</option>
            <option value="rating">{t("sortRating")}</option>
          </Select>
        </Field>

        <Field label={tc("owner.form.category")}>
          <Select
            value={get("category")}
            onChange={(e) => apply({ category: e.target.value })}
          >
            <option value="">{t("anyCategory")}</option>
            {EQUIPMENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {tc(`equipment.category.${category}`)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={tc("owner.form.aimag")}>
          <Select
            value={get("aimag")}
            onChange={(e) => apply({ aimag: e.target.value })}
          >
            <option value="">{t("anyAimag")}</option>
            {AIMAGS.map((aimag) => (
              <option key={aimag.name} value={aimag.name}>
                {locale === "en" ? aimag.nameEn : aimag.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t("priceRange")}>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder={t("min")}
              defaultValue={get("minRate")}
              className="tabular"
              onBlur={(e) => apply({ minRate: e.target.value })}
            />
            <Input
              type="number"
              placeholder={t("max")}
              defaultValue={get("maxRate")}
              className="tabular"
              onBlur={(e) => apply({ maxRate: e.target.value })}
            />
          </div>
        </Field>

        <Field label={t("dates")}>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              defaultValue={get("start")}
              onChange={(e) => apply({ start: e.target.value })}
            />
            <Input
              type="date"
              defaultValue={get("end")}
              onChange={(e) => apply({ end: e.target.value })}
            />
          </div>
        </Field>

        <div className="flex items-end gap-2 xl:col-span-2">
          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-ink-200 px-3 text-[13px] font-semibold text-ink-700">
            <input
              type="checkbox"
              className="size-4 accent-[var(--color-brand-600)]"
              checked={get("operator") === "1"}
              onChange={(e) => apply({ operator: e.target.checked ? "1" : "" })}
            />
            {t("withOperator")}
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
