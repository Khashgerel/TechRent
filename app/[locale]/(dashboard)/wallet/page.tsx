import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowDownToLine, Receipt, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { StatTile } from "@/components/ui/stat-tile";
import { InvoicePanel } from "@/components/wallet/invoice-panel";
import { TopupForm } from "@/components/wallet/topup-form";
import { requireSession } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { formatMNT, formatMNTCompact } from "@/lib/money";
import { getWalletPage } from "@/lib/payments/queries";
import { qpayConfigured, qpayEnvironment } from "@/lib/payments/qpay";
import { simulationEnabled } from "@/lib/payments/sandbox";
import type { PaymentInvoiceStatus } from "@/lib/generated/prisma/enums";

const STATUS_TONE: Record<
  PaymentInvoiceStatus,
  "brand" | "positive" | "caution" | "neutral"
> = {
  PENDING: "caution",
  PAID: "positive",
  CANCELLED: "neutral",
  FAILED: "neutral",
};

export default async function WalletPage({ params }: PageProps<"/[locale]/wallet">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireSession(locale);
  const t = await getTranslations("wallet");

  const { balance, pending, history, toppedUpTotal } = await getWalletPage(session.uid);

  // Reading the environment can throw when it is misconfigured; the page should
  // still render and say so rather than 500.
  let environment: string | null = null;
  try {
    environment = qpayEnvironment();
  } catch {
    environment = null;
  }

  const configured = qpayConfigured() && environment !== null;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          environment === "sandbox" ? (
            <Badge tone="caution">{t("sandboxBadge")}</Badge>
          ) : environment === "production" ? (
            <Badge tone="positive">{t("productionBadge")}</Badge>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          icon={Wallet}
          label={t("balance")}
          value={formatMNTCompact(balance, locale)}
          tone="brand"
        />
        <StatTile
          icon={ArrowDownToLine}
          label={t("toppedUpTotal")}
          value={formatMNTCompact(toppedUpTotal, locale)}
          tone="positive"
        />
        <StatTile
          icon={Receipt}
          label={t("invoiceCount")}
          value={history.length}
          tone="neutral"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="flex flex-col gap-4 lg:col-span-3">
          {pending ? (
            <InvoicePanel
              simulation={simulationEnabled()}
              invoice={{
                id: pending.id,
                amount: pending.amount,
                senderInvoiceNo: pending.senderInvoiceNo,
                qrImage: pending.qrImage,
                qrText: pending.qrText,
                shortUrl: pending.shortUrl,
                deeplinks: pending.deeplinks,
              }}
            />
          ) : null}

          <TopupForm disabled={!configured} />
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("historyTitle")}</CardTitle>
            </CardHeader>

            {history.length === 0 ? (
              <CardBody>
                <EmptyState
                  icon={<Receipt className="size-8" />}
                  title={t("noInvoices")}
                  description={t("noInvoicesHint")}
                />
              </CardBody>
            ) : (
              <div className="divide-y divide-ink-200/70">
                {history.map((invoice) => (
                  <div key={invoice.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-ink-900 tabular">
                        {formatMNT(invoice.amount, locale)}
                      </p>
                      <p className="truncate text-[12px] text-ink-500">
                        {formatDate(invoice.createdAt, locale)}
                        {invoice.qpayPaymentId ? ` · ${invoice.qpayPaymentId}` : ""}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[invoice.status]}>
                      {t(`status.${invoice.status}`)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
