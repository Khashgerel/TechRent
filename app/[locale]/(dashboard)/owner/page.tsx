import { getTranslations, setRequestLocale } from "next-intl/server";
import { Activity, Coins, Percent, Truck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { StatTile } from "@/components/ui/stat-tile";
import { BookingRow } from "@/components/bookings/booking-row";
import { EquipmentCard } from "@/components/equipment/equipment-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { MagnitudeBars } from "@/components/charts/magnitude-bars";
import { requireRole } from "@/lib/auth/guards";
import { getOwnerDashboard } from "@/lib/owner/queries";
import { formatMNTCompact } from "@/lib/money";
import { toRevenuePoints } from "@/lib/charts";

export default async function OwnerDashboardPage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireRole(locale, "OWNER");
  const t = await getTranslations();
  const data = await getOwnerDashboard(session.uid);

  const firstName = session.name.split(" ")[0];

  return (
    <>
      <PageHeader
        title={t("owner.greeting", { name: firstName })}
        description={t("owner.greetingSub")}
        actions={
          <Link
            href="/owner/equipment/new"
            className={buttonVariants({ className: "hidden sm:inline-flex" })}
          >
            {t("owner.addEquipment")}
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={Truck}
          label={t("owner.stats.equipment")}
          value={data.equipmentCount}
          tone="brand"
        />
        <StatTile
          icon={Activity}
          label={t("owner.stats.active")}
          value={data.activeCount}
          tone="accent"
        />
        <StatTile
          icon={Percent}
          label={t("owner.stats.utilization")}
          value={`${data.utilization}%`}
          tone="positive"
        />
        <StatTile
          icon={Coins}
          label={t("owner.stats.revenue")}
          value={formatMNTCompact(data.monthRevenue, locale)}
          hint={`${t("owner.stats.revenueTotal")}: ${formatMNTCompact(data.lifetimeRevenue, locale)}`}
          tone="neutral"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t("owner.revenueChart")}</CardTitle>
          </CardHeader>
          <CardBody>
            <RevenueChart data={toRevenuePoints(data.revenueSeries, locale)} />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("owner.utilizationChart")}</CardTitle>
          </CardHeader>
          <CardBody>
            {data.perEquipment.length ? (
              <MagnitudeBars
                rows={data.perEquipment.slice(0, 8).map((item) => ({
                  id: item.id,
                  name: item.name,
                  fill: item.utilization,
                  label: `${item.utilization}%`,
                }))}
              />
            ) : (
              <p className="text-[13px] text-ink-500">{t("common.empty")}</p>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("owner.activeBookings")}</CardTitle>
            <Link
              href="/owner/bookings"
              className="text-[13px] font-bold text-brand-600 hover:text-brand-700"
            >
              {t("common.view")} →
            </Link>
          </CardHeader>
          {data.activeBookings.length ? (
            <div>
              {data.activeBookings.map((booking) => (
                <BookingRow
                  key={booking.id}
                  booking={{
                    id: booking.id,
                    status: booking.status,
                    startDate: booking.startDate,
                    endDate: booking.endDate,
                    totalAmount: booking.totalAmount,
                    payout: booking.ownerPayout,
                    title: booking.order.title,
                    counterparty:
                      booking.order.company.companyProfile?.companyName ??
                      booking.order.company.name,
                    operatorName: booking.operator?.user.name,
                    category: booking.equipment?.category ?? "EXCAVATOR",
                    equipmentName: booking.equipment
                      ? `${booking.equipment.make} ${booking.equipment.model}`
                      : null,
                    photo: booking.equipment?.photos[0],
                  }}
                />
              ))}
            </div>
          ) : (
            <CardBody>
              <EmptyState title={t("owner.bookings.empty")} />
            </CardBody>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-extrabold tracking-tight text-ink-900">
            {t("owner.myEquipment")}
          </h2>
          <Link
            href="/owner/equipment"
            className="text-[13px] font-bold text-brand-600 hover:text-brand-700"
          >
            {t("common.view")} →
          </Link>
        </div>

        {data.equipment.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.equipment.slice(0, 6).map((item) => (
              <EquipmentCard
                key={item.id}
                equipment={item}
                href={`/owner/equipment/${item.id}`}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={t("owner.noEquipment")}
            description={t("owner.noEquipmentHint")}
            action={
              <Link
                href="/owner/equipment/new"
                className="text-[13px] font-bold text-brand-600 hover:text-brand-700"
              >
                {t("owner.addEquipment")} →
              </Link>
            }
          />
        )}
      </div>
    </>
  );
}
