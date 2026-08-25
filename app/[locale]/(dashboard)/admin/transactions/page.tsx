import { getTranslations, setRequestLocale } from "next-intl/server";
import { Coins, Receipt, Scale } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { StatTile } from "@/components/ui/stat-tile";
import { LedgerFilters } from "@/components/admin/ledger-filters";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { requireRole } from "@/lib/auth/guards";
import { getLedger, type LedgerFilters as Filters } from "@/lib/admin/queries";
import { toRevenuePoints } from "@/lib/charts";
import { formatDate } from "@/lib/dates";
import { formatMNT, formatMNTCompact } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { TransactionType } from "@/lib/generated/prisma/enums";

const TYPES: TransactionType[] = [
  "DEPOSIT_HOLD",
  "BALANCE_HOLD",
  "RELEASE",
  "REFUND",
  "TOPUP",
  "WITHDRAWAL",
  "STORE_PURCHASE",
];

const TYPE_TONE: Record<TransactionType, "brand" | "positive" | "caution" | "neutral"> = {
  DEPOSIT_HOLD: "caution",
  BALANCE_HOLD: "caution",
  RELEASE: "positive",
  REFUND: "neutral",
  TOPUP: "brand",
  WITHDRAWAL: "neutral",
  STORE_PURCHASE: "brand",
};

export default async function AdminTransactionsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/transactions">) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requireRole(locale, "ADMIN");
  const t = await getTranslations();

  const sp = await searchParams;
  const one = (key: string) => {
    const value = sp[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const filters: Filters = {
    type: TYPES.find((type) => type === one("type")),
    month: one("month") || undefined,
  };

  const ledger = await getLedger(filters);

  return (
    <>
      <PageHeader
        title={t("admin.ledger.title")}
        description={t("admin.ledger.subtitle")}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          icon={Coins}
          label={t("admin.ledger.commissionTotal")}
          value={formatMNTCompact(ledger.commissionTotal, locale)}
          tone="accent"
        />
        <StatTile
          icon={Scale}
          label={
            filters.month
              ? t("admin.ledger.commissionMonth", { month: filters.month })
              : t("admin.ledger.commissionAll")
          }
          value={formatMNTCompact(ledger.commissionInRange, locale)}
          tone="brand"
        />
        <StatTile
          icon={Receipt}
          label={t("admin.ledger.transactionCount")}
          value={ledger.total}
          hint={t("admin.ledger.showing", { count: ledger.shown })}
          tone="neutral"
        />
      </div>

      <Card className="my-4">
        <CardHeader>
          <CardTitle>{t("admin.ledger.commissionChart")}</CardTitle>
        </CardHeader>
        <CardBody>
          <RevenueChart data={toRevenuePoints(ledger.commissionSeries, locale)} />
        </CardBody>
      </Card>

      <LedgerFilters months={ledger.months} counts={ledger.countsByType} />

      {ledger.transactions.length === 0 ? (
        <EmptyState
          icon={<Receipt className="size-8" />}
          title={t("admin.ledger.none")}
          description={t("admin.ledger.noneHint")}
        />
      ) : (
        <Card>
          <div className="divide-y divide-ink-200/70">
            {ledger.transactions.map((transaction) => {
              // Every transaction balances, so the sum of its credits is the
              // amount that moved.
              const moved = transaction.entries
                .filter((entry) => entry.amount > 0)
                .reduce((sum, entry) => sum + entry.amount, 0);

              return (
                <div key={transaction.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge tone={TYPE_TONE[transaction.type]}>
                      {t(`admin.ledger.types.${transaction.type}`)}
                    </Badge>

                    <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-ink-900">
                      {transaction.booking?.order.title ??
                        (transaction.storeOrderId
                          ? t("admin.ledger.storeOrder")
                          : (transaction.memo ?? "—"))}
                    </span>

                    <span className="shrink-0 text-[14px] font-extrabold text-ink-900 tabular">
                      {formatMNT(moved, locale)}
                    </span>
                    <span className="w-24 shrink-0 text-right text-[12px] text-ink-400">
                      {formatDate(transaction.createdAt, locale)}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {transaction.entries.map((entry) => (
                      <span
                        key={entry.id}
                        className="text-[12px] text-ink-500 tabular"
                      >
                        {/* System accounts are named by their kind, which is
                            translated; only a wallet borrows a person's name. */}
                        {entry.account.kind === "USER_WALLET"
                          ? (entry.account.user?.name ??
                            entry.account.label ??
                            t("admin.ledger.accounts.USER_WALLET"))
                          : t(`admin.ledger.accounts.${entry.account.kind}`)}
                        {": "}
                        <span
                          className={cn(
                            "font-bold",
                            entry.amount >= 0 ? "text-positive" : "text-critical",
                          )}
                        >
                          {entry.amount >= 0 ? "+" : "−"}
                          {formatMNT(Math.abs(entry.amount), locale)}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </>
  );
}
