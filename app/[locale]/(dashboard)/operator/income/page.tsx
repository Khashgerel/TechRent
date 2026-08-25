import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, Coins, TrendingUp, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { StatTile } from "@/components/ui/stat-tile";
import { requireRole } from "@/lib/auth/guards";
import { getOperatorIncome } from "@/lib/bookings/queries";
import { formatDate } from "@/lib/dates";
import { formatMNT, formatMNTCompact } from "@/lib/money";
import { cn } from "@/lib/utils";

export default async function OperatorIncomePage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireRole(locale, "OPERATOR");
  const t = await getTranslations();
  const income = await getOperatorIncome(session.uid);

  return (
    <>
      <PageHeader
        title={t("operator.income.title")}
        description={t("operator.income.subtitle")}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={Wallet}
          label={t("operator.income.available")}
          value={formatMNTCompact(income.available, locale)}
          tone="positive"
        />
        <StatTile
          icon={Clock}
          label={t("operator.income.pending")}
          value={formatMNTCompact(income.pending, locale)}
          tone="accent"
        />
        <StatTile
          icon={TrendingUp}
          label={t("operator.income.thisMonth")}
          value={formatMNTCompact(income.monthIncome, locale)}
          tone="brand"
        />
        <StatTile
          icon={Coins}
          label={t("operator.income.lifetime")}
          value={formatMNTCompact(income.lifetimeIncome, locale)}
          tone="neutral"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t("operator.income.transactions")}</CardTitle>
        </CardHeader>

        {income.transactions.length ? (
          <div className="divide-y divide-ink-200/70">
            {income.transactions.map((entry) => {
              const booking = entry.transaction.booking;
              const label = booking?.order.title ?? entry.transaction.memo ?? "—";
              const counterparty =
                booking?.order.company.companyProfile?.companyName ??
                booking?.equipment?.make;

              return (
                <div key={entry.id} className="flex items-center gap-3 px-5 py-3">
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
            <EmptyState title={t("operator.income.noTransactions")} />
          </CardBody>
        )}
      </Card>
    </>
  );
}
