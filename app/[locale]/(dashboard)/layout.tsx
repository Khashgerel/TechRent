import { setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/shell/app-shell";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export default async function DashboardLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireSession(locale);

  const unread = await db.notification.count({
    where: { userId: session.uid, readAt: null },
  });

  return (
    <AppShell
      role={session.role}
      roles={session.roles}
      name={session.name}
      impersonator={session.actor?.name ?? null}
      badges={{ notifications: unread }}
    >
      {children}
    </AppShell>
  );
}
