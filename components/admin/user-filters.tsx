"use client";

import { useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import type { Role, VerificationStatus } from "@/lib/generated/prisma/enums";

const ROLES: Role[] = ["OWNER", "OPERATOR", "COMPANY", "ADMIN"];
const STATUSES: VerificationStatus[] = [
  "PENDING",
  "VERIFIED",
  "UNVERIFIED",
  "REJECTED",
];

export function UserFilters() {
  const t = useTranslations("admin.users");
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
    <div className="card mb-4 p-4">
      <form
        className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          apply({ q: String(data.get("q") ?? "") });
        }}
      >
        <Field label={tc("common.search")}>
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

        <Field label={t("role")}>
          <Select value={get("role")} onChange={(e) => apply({ role: e.target.value })}>
            <option value="">{tc("common.all")}</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {tc(`roles.${role}`)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t("verification")}>
          <Select
            value={get("verification")}
            onChange={(e) => apply({ verification: e.target.value })}
          >
            <option value="">{tc("common.all")}</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(`status.${status}`)}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex items-end gap-2">
          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-ink-200 px-3 text-[13px] font-semibold text-ink-700">
            <input
              type="checkbox"
              className="size-4 accent-[var(--color-brand-600)]"
              checked={get("suspended") === "1"}
              onChange={(e) => apply({ suspended: e.target.checked ? "1" : "" })}
            />
            {t("suspendedOnly")}
          </label>

          <Button type="submit" disabled={pending}>
            <Search />
            {tc("common.search")}
          </Button>

          {[...params.keys()].length ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => startTransition(() => router.replace(pathname))}
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
