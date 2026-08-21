"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { Languages } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const other = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(() => {
          router.replace(pathname, { locale: other });
        })
      }
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-ink-200 bg-surface px-2.5 text-[13px] font-bold text-ink-600 transition-colors hover:border-ink-300 hover:text-ink-900 disabled:opacity-60",
        className,
      )}
      aria-label={`Switch to ${other === "mn" ? "Mongolian" : "English"}`}
    >
      <Languages className="size-4 text-ink-400" />
      {other.toUpperCase()}
    </button>
  );
}
