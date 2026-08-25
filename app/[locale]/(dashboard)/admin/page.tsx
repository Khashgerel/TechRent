import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  BadgeCheck,
  Coins,
  Lock,
  Package,
  ShieldAlert,
  ShoppingBag,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { StatTile } from "@/components/ui/stat-tile";
import { BookingRow } from "@/components/bookings/booking-row";
import { MagnitudeBars } from "@/components/charts/magnitude-bars";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { requireRole } from "@/lib/auth/guards";
import { getAdminDashboard } from "@/lib/admin/queries";
import { auditMessageKey } from "@/lib/admin/audit";
import { toRevenuePoints } from "@/lib/charts";
import { formatDate } from "@/lib/dates";
import { formatMNTCompact } from "@/lib/money";
import { equipmentName } from "@/lib/equipment";

export default async function AdminDashboardPage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requireRole(locale, "ADMIN");
  const t = await getTranslations();
  const data = await getAdminDashboard();

  const statusMax = Math.max(1, ...data.bookingsByStatus.map((row) => row.count));

  // The three queues the console exists to clear, each one a link to the page
  // that clears it.
  const queues = [
    {
      href: "/admin/users",
      icon: BadgeCheck,
      label: t("admin.queues.verification"),
      count: data.users.pending,
    },
    {
      href: "/admin/store",
      icon: Wrench,
      label: t("admin.queues.service"),
      count: data.openRequests,
    },
    {
      href: "/admin/store",
      icon: Package,
      label: t("admin.queues.lowStock"),
      count: data.lowStock,
    },
  ];

  return (
    <>
      <PageHeader
        title={t("admin.dashboard.title")}
        description={t("admin.dashboard.subtitle")}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={Coins}
          label={t("admin.dashboard.gmv")}
          value={formatMNTCompact(data.gmv, locale)}
          hint={t("admin.dashboard.gmvHint")}
          tone="brand"
        />
        <StatTile
          icon={ShieldAlert}
          label={t("admin.dashboard.commission")}
          value={formatMNTCompact(data.commissionTotal, locale)}
          hint={t("admin.dashboard.thisMonth", {
            amount: formatMNTCompact(data.commissionMonth, locale),
          })}
          tone="accent"
        />
        <StatTile
          icon={Lock}
          label={t("admin.dashboard.escrow")}
          value={formatMNTCompact(data.escrowHeld, locale)}
          hint={t("admin.dashboard.escrowHint", { count: data.liveBookings })}
          tone="positive"
        />
        <StatTile
          icon={ShoppingBag}
          label={t("admin.dashboard.storeSales")}
          value={formatMNTCompact(data.storeSales, locale)}
          hint={t("admin.dashboard.storeOrders", { count: data.storeOrderCount })}
          tone="neutral"
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={Users}
          label={t("admin.dashboard.users")}
          value={data.users.total}
          hint={[
            `${data.users.byRole.OWNER ?? 0} ${t("roles.OWNER").toLowerCase()}`,
            `${data.users.byRole.OPERATOR ?? 0} ${t("roles.OPERATOR").toLowerCase()}`,
            `${data.users.byRole.COMPANY ?? 0} ${t("roles.COMPANY").toLowerCase()}`,
          ].join(" · ")}
          tone="brand"
        />
        <StatTile
          icon={Truck}
          label={t("admin.dashboard.equipment")}
          value={data.equipmentCount}
          tone="neutral"
        />
        <StatTile
          icon={Package}
          label={t("admin.dashboard.openOrders")}
          value={data.openOrders}
          hint={t("admin.dashboard.openOrdersHint")}
          tone="accent"
        />
        <StatTile
          icon={ShieldAlert}
          label={t("admin.dashboard.suspended")}
          value={data.users.suspended}
          tone="neutral"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t("admin.dashboard.commissionChart")}</CardTitle>
            <span className="text-[12px] font-semibold text-ink-500">
              {t("admin.dashboard.lastMonths", { count: 6 })}
            </span>
          </CardHeader>
          <CardBody>
            <RevenueChart data={toRevenuePoints(data.commissionSeries, locale)} />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("admin.dashboard.bookingMix")}</CardTitle>
          </CardHeader>
          <CardBody>
            {data.bookingsByStatus.length ? (
              <MagnitudeBars
                rows={data.bookingsByStatus.map((row) => ({
                  id: row.status,
                  name: t(`bookingStatus.${row.status}`),
                  fill: (row.count / statusMax) * 100,
                  label: String(row.count),
                }))}
              />
            ) : (
              <EmptyState title={t("common.empty")} />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("admin.queues.title")}</CardTitle>
          </CardHeader>
          <div className="divide-y divide-ink-200/70">
            {queues.map((queue) => {
              const Icon = queue.icon;
              return (
                <Link
                  key={queue.label}
                  href={queue.href}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-ink-50/70"
                >
                  <Icon className="size-5 shrink-0 text-ink-400" />
                  <span className="flex-1 text-[13px] font-bold text-ink-900">
                    {queue.label}
                  </span>
                  <Badge tone={queue.count ? "caution" : "neutral"}>
                    {queue.count}
                  </Badge>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t("admin.dashboard.liveBookings")}</CardTitle>
            <Link
              href="/admin/transactions"
              className="text-[12px] font-bold text-brand-600"
            >
              {t("admin.dashboard.viewLedger")} →
            </Link>
          </CardHeader>

          {data.recentBookings.length ? (
            <div>
              {data.recentBookings.map((booking) => (
                <BookingRow
                  key={booking.id}
                  booking={{
                    id: booking.id,
                    status: booking.status,
                    startDate: booking.startDate,
                    endDate: booking.endDate,
                    totalAmount: booking.totalAmount,
                    title: booking.order.title,
                    counterparty:
                      booking.order.company.companyProfile?.companyName ??
                      booking.order.company.name,
                    operatorName: booking.operator?.user.name ?? null,
                    category: booking.order.category,
                    equipmentName: booking.equipment
                      ? equipmentName(booking.equipment)
                      : null,
                    photo: booking.equipment?.photos[0] ?? null,
                  }}
                />
              ))}
            </div>
          ) : (
            <CardBody>
              <EmptyState title={t("admin.dashboard.noLiveBookings")} />
            </CardBody>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t("admin.dashboard.auditTrail")}</CardTitle>
        </CardHeader>

        {data.recentAudit.length ? (
          <div className="divide-y divide-ink-200/70">
            {data.recentAudit.map((entry) => {
              const key = auditMessageKey(entry.action);

              return (
              <div key={entry.id} className="flex items-center gap-3 px-5 py-3">
                <Badge tone="neutral">{t.has(key) ? t(key) : entry.action}</Badge>
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink-600">
                  {entry.actor?.name ?? t("admin.dashboard.systemActor")}
                  {entry.targetType ? ` · ${entry.targetType}` : ""}
                </span>
                <span className="shrink-0 text-[12px] text-ink-400">
                  {formatDate(entry.createdAt, locale)}
                </span>
              </div>
              );
            })}
          </div>
        ) : (
          <CardBody>
            <EmptyState
              title={t("admin.dashboard.noAudit")}
              description={t("admin.dashboard.noAuditHint")}
            />
          </CardBody>
        )}
      </Card>
    </>
  );
}
