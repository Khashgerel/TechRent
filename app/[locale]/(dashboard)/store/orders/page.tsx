import { getTranslations, setRequestLocale } from "next-intl/server";
import { Coins, MapPin, Package, ShoppingBag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { StatTile } from "@/components/ui/stat-tile";
import { StoreTabs } from "@/components/store/store-tabs";
import { requireSession } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { formatMNT, formatMNTCompact } from "@/lib/money";
import { partName } from "@/lib/store/catalog";
import { getStoreOrders, getStoreWallet } from "@/lib/store/queries";
import type { StoreOrderStatus } from "@/lib/generated/prisma/enums";

const STATUS_TONE: Record<
  StoreOrderStatus,
  "brand" | "positive" | "caution" | "neutral"
> = {
  PENDING: "caution",
  PAID: "brand",
  SHIPPED: "brand",
  DELIVERED: "positive",
  CANCELLED: "neutral",
};

export default async function StoreOrdersPage({
  params,
}: PageProps<"/[locale]/store/orders">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireSession(locale);
  const t = await getTranslations("store");

  const [orders, wallet] = await Promise.all([
    getStoreOrders(session.uid),
    getStoreWallet(session.uid),
  ]);

  return (
    <>
      <PageHeader title={t("ordersTitle")} description={t("ordersSubtitle")} />

      <StoreTabs />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatTile
          icon={ShoppingBag}
          label={t("ordersPlaced")}
          value={orders.length}
          tone="brand"
        />
        <StatTile
          icon={Coins}
          label={t("totalSpent")}
          value={formatMNTCompact(wallet.spent, locale)}
          tone="accent"
        />
        <StatTile
          icon={Package}
          label={t("openRequests")}
          value={wallet.openRequests}
          tone="neutral"
        />
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="size-8" />}
          title={t("noOrders")}
          description={t("noOrdersHint")}
          action={
            <Link href="/store" className={buttonVariants({ size: "sm" })}>
              {t("browseParts")}
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="min-w-0">
                  <CardTitle>
                    {t("orderNumber", { id: order.id.slice(-6).toUpperCase() })}
                  </CardTitle>
                  <p className="mt-0.5 text-[12px] text-ink-500">
                    {formatDate(order.createdAt, locale)}
                    {order.address ? (
                      <span className="inline-flex items-center gap-1 pl-2">
                        <MapPin className="size-3.5" />
                        {order.address}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge tone={STATUS_TONE[order.status]}>
                    {t(`orderStatus.${order.status}`)}
                  </Badge>
                  <span className="text-[15px] font-extrabold text-ink-900 tabular">
                    {formatMNT(order.totalAmount, locale)}
                  </span>
                </div>
              </CardHeader>

              <div className="divide-y divide-ink-200/70">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-ink-900">
                        {partName(item.part, locale)}
                      </p>
                      <p className="text-[12px] text-ink-500 tabular">
                        {item.part.sku} · {item.quantity} ×{" "}
                        {formatMNT(item.unitPrice, locale)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[13px] font-bold text-ink-700 tabular">
                      {formatMNT(item.unitPrice * item.quantity, locale)}
                    </span>
                  </div>
                ))}
              </div>

              {order.note ? (
                <p className="border-t border-ink-200/70 px-5 py-3 text-[13px] text-ink-500">
                  {order.note}
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
