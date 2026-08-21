import { getTranslations, setRequestLocale } from "next-intl/server";
import { Coins, Lock, TrendingUp, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { StatTile } from "@/components/ui/stat-tile";
import { MagnitudeBars } from "@/components/charts/magnitude-bars";
import { requireRole } from "@/lib/auth/guards";
import { getOwnerEarnings } from "@/lib/owner/queries";
import { formatDate } from "@/lib/dates";
import { formatMNT, formatMNTCompact } from "@/lib/money";
import { cn } from "@/lib/utils";

export default async function OwnerEarningsPage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireRole(locale, "OWNER");
  const t = await getTranslations();
  const data = await getOwnerEarnings(session.uid);

  const topEarner = data.byEquipment[0]?.total ?? 1;

  return (
    <>
      <PageHeader
        title={t("owner.earnings.title")}
        description={t("owner.earnings.subtitle")}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={Wallet}
          label={t("owner.earnings.available")}
          value={formatMNTCompact(data.available, locale)}
          tone="positive"
        />
        <StatTile
          icon={Lock}
          label={t("owner.earnings.inEscrow")}
          value={formatMNTCompact(data.inEscrow, locale)}
          tone="accent"
        />
        <StatTile
          icon={TrendingUp}
          label={t("owner.earnings.thisMonth")}
          value={formatMNTCompact(data.monthRevenue, locale)}
          tone="brand"
        />
        <StatTile
          icon={Coins}
          label={t("owner.earnings.lifetime")}
          value={formatMNTCompact(data.lifetimeRevenue, locale)}
          tone="neutral"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t("owner.earnings.transactions")}</CardTitle>
          </CardHeader>

          {data.transactions.length ? (
            <div className="divide-y divide-ink-200/70">
              {data.transactions.map((entry) => {
                const booking = entry.transaction.booking;
                const label =
                  booking?.order.title ?? entry.transaction.memo ?? "—";
                const counterparty =
                  booking?.order.company.companyProfile?.companyName ??
                  booking?.equipment?.make;

                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-ink-900">
                        {label}
                      </p>
                      <p className="truncate text-[12px] text-ink-500">
                        {counterparty ? `${counterparty} · ` : ""}
                        {formatDate(entry.createdAt, locale)}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "shrink-0 text-[14px] font-extrabold tabular",
                        entry.amount >= 0 ? "text-positive" : "text-ink-500",
                      )}
                    >
                      {entry.amount >= 0 ? "+" : ""}
                      {formatMNT(entry.amount, locale)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <CardBody>
              <EmptyState title={t("owner.earnings.noTransactions")} />
            </CardBody>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("owner.earnings.byEquipment")}</CardTitle>
          </CardHeader>
          <CardBody>
            {data.byEquipment.length ? (
              <MagnitudeBars
                rows={data.byEquipment.map((item, index) => ({
                  id: `${index}`,
                  name: item.name,
                  fill: Math.round((item.total / topEarner) * 100),
                  label: formatMNTCompact(item.total, locale),
                }))}
              />
            ) : (
              <p className="text-[13px] text-ink-500">
                {t("owner.earnings.noTransactions")}
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
