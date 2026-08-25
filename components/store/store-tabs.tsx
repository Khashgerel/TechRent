"use client";

import { useTranslations } from "next-intl";
import { Package, ShoppingBag, Wrench } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/store", labelKey: "tabCatalogue", icon: Package },
  { href: "/store/orders", labelKey: "tabOrders", icon: ShoppingBag },
  { href: "/store/service", labelKey: "tabService", icon: Wrench },
] as const;

/**
 * The store is one sidebar entry with three screens behind it, so the switch
 * lives here rather than adding three shared links to every role's navigation.
 */
export function StoreTabs() {
  const t = useTranslations("store");
  const pathname = usePathname();

  return (
    <div className="mb-4 flex flex-wrap gap-1 rounded-[var(--radius-control)] border border-ink-200 bg-surface-muted p-1">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-[calc(var(--radius-control)-2px)] px-3 py-2 text-[13px] font-semibold transition-colors",
              active
                ? "bg-surface text-brand-700 shadow-xs"
                : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
            )}
          >
            <Icon className="size-4" />
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </div>
  );
}
