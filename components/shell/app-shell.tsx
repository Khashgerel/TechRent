"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, Menu, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/generated/prisma/enums";
import { Logo } from "./logo";
import { LanguageSwitcher } from "./language-switcher";
import { SidebarNav, type NavBadges } from "./sidebar";
import { UserMenu } from "./user-menu";

export function AppShell({
  role,
  roles,
  name,
  badges,
  children,
}: {
  /** The role being viewed — what the user menu labels the account as. */
  role: Role;
  /** Every role held, which is what the sidebar is built from. */
  roles: Role[];
  name: string;
  badges?: NavBadges;
  children: React.ReactNode;
}) {
  const t = useTranslations("nav");
  const [mobileOpen, setMobileOpen] = useState(false);
  const unread = badges?.notifications ?? 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-ink-200 bg-surface/90 px-4 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="-ml-1 rounded-[var(--radius-control)] p-2 text-ink-500 hover:bg-ink-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </button>

        <Link href="/" className="shrink-0">
          <Logo />
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <Link
            href="/notifications"
            className="relative inline-flex size-9 items-center justify-center rounded-[var(--radius-control)] border border-ink-200 bg-surface text-ink-500 transition-colors hover:border-ink-300 hover:text-ink-900"
            aria-label={t("notifications")}
          >
            <Bell className="size-4" />
            {unread > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-critical px-1 text-[10px] font-bold text-white tabular">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </Link>
          <UserMenu name={name} role={role} />
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 flex-col border-r border-ink-200 bg-surface lg:flex">
          <SidebarNav roles={roles} badges={badges} />
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            />
            <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-surface shadow-[var(--shadow-overlay)]">
              <div className="flex h-14 items-center justify-between border-b border-ink-200 px-4">
                <Logo />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-[var(--radius-control)] p-2 text-ink-500 hover:bg-ink-100"
                >
                  <X className="size-5" />
                </button>
              </div>
              <SidebarNav
                roles={roles}
                badges={badges}
                onNavigate={() => setMobileOpen(false)}
              />
            </aside>
          </div>
        ) : null}

        <main className={cn("min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8")}>
          {children}
        </main>
      </div>
    </div>
  );
}
