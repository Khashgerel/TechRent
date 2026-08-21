"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { signOutAction } from "@/lib/auth/actions";
import type { Role } from "@/lib/generated/prisma/enums";

export function UserMenu({ name, role }: { name: string; role: Role }) {
  const t = useTranslations();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-[var(--radius-control)] p-1 pr-2 transition-colors hover:bg-ink-100"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={name} size="sm" />
        <span className="hidden text-left sm:block">
          <span className="block max-w-[140px] truncate text-[13px] font-bold leading-tight text-ink-900">
            {name}
          </span>
          <span className="block text-[11px] font-semibold leading-tight text-ink-500">
            {t(`roles.${role}`)}
          </span>
        </span>
        <ChevronDown className="size-4 text-ink-400" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-[var(--radius-card)] border border-ink-200 bg-surface shadow-[var(--shadow-overlay)]"
        >
          <div className="border-b border-ink-200 px-4 py-3">
            <p className="truncate text-[13px] font-bold text-ink-900">{name}</p>
            <p className="text-[11px] font-semibold text-ink-500">
              {t(`roles.${role}`)}
            </p>
          </div>
          <form action={signOutAction.bind(null, locale)}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-semibold text-ink-600 transition-colors hover:bg-ink-50 hover:text-critical"
            >
              <LogOut className="size-4" />
              {t("common.signOut")}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
