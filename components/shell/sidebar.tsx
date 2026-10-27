"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/generated/prisma/enums";
import { orderedRoles } from "@/lib/roles";
import { ADMIN_SETTINGS, NAV, SHARED_ITEMS, type NavItem } from "./nav-config";

export type NavBadges = Partial<Record<"notifications" | "offers" | "jobs", number>>;

function isActive(pathname: string, href: string) {
  // "/owner" should not stay lit while on "/owner/equipment", but
  // "/owner/equipment" should stay lit on "/owner/equipment/abc".
  if (href === "/owner" || href === "/company" || href === "/operator" || href === "/admin") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  badges,
  onNavigate,
}: {
  item: NavItem;
  badges: NavBadges;
  onNavigate?: () => void;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const count = item.badge ? badges[item.badge] : undefined;
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-[13px] font-semibold transition-colors",
        active
          ? "bg-brand-600 text-white shadow-sm"
          : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
      )}
    >
      <Icon
        className={cn("size-4 shrink-0", active ? "text-white" : "text-ink-400 group-hover:text-ink-600")}
      />
      <span className="truncate">{t(item.labelKey)}</span>
      {count ? (
        <span
          className={cn(
            "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular",
            active ? "bg-white/20 text-white" : "bg-accent-500 text-ink-950",
          )}
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}

export function SidebarNav({
  roles,
  badges = {},
  onNavigate,
}: {
  roles: Role[];
  badges?: NavBadges;
  onNavigate?: () => void;
}) {
  const t = useTranslations("nav");
  // Every area this account may reach, in the product's own role order. Someone
  // who owns machines, operates them and orders work sees all three.
  const sections = orderedRoles(roles).flatMap((role) => NAV[role]);

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4 scrollbar-thin">
      {sections.map((section) => (
        <div key={section.titleKey} className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-ink-400">
            {t(section.titleKey)}
          </p>
          {section.items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              badges={badges}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ))}

      <div className="mt-auto flex flex-col gap-1 border-t border-ink-200 pt-4">
        {SHARED_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} badges={badges} onNavigate={onNavigate} />
        ))}
        {roles.includes("ADMIN") ? (
          <NavLink item={ADMIN_SETTINGS} badges={badges} onNavigate={onNavigate} />
        ) : null}
      </div>
    </nav>
  );
}
