import { getTranslations, setRequestLocale } from "next-intl/server";
import { Boxes, Package, ShoppingBag, Wrench } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { StatTile } from "@/components/ui/stat-tile";
import { PartEditor } from "@/components/admin/part-editor";
import {
  OrderStatusActions,
  RequestStatusActions,
} from "@/components/admin/status-actions";
import { requireRole } from "@/lib/auth/guards";
import { getStoreAdmin } from "@/lib/admin/queries";
import { formatDate } from "@/lib/dates";
import { formatMNT, formatMNTCompact } from "@/lib/money";
import { LOW_STOCK_AT, partName } from "@/lib/store/catalog";
import type {
  ServiceRequestStatus,
  StoreOrderStatus,
} from "@/lib/generated/prisma/enums";

const ORDER_TONE: Record<
  StoreOrderStatus,
  "brand" | "positive" | "caution" | "neutral"
> = {
  PENDING: "caution",
  PAID: "brand",
  SHIPPED: "brand",
  DELIVERED: "positive",
  CANCELLED: "neutral",
};

const REQUEST_TONE: Record<
  ServiceRequestStatus,
  "brand" | "positive" | "caution" | "neutral"
> = {
  OPEN: "caution",
  SCHEDULED: "brand",
  DONE: "positive",
  CANCELLED: "neutral",
};

export default async function AdminStorePage({
  params,
}: PageProps<"/[locale]/admin/store">) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requireRole(locale, "ADMIN");
  const t = await getTranslations();
  const { parts, orders, requests, stockValue } = await getStoreAdmin();

  const lowStock = parts.filter((p) => p.active && p.stock <= LOW_STOCK_AT);
  const openRequests = requests.filter((r) => r.status === "OPEN").length;
  const toShip = orders.filter((o) => o.status === "PAID").length;

  return (
    <>
      <PageHeader
        title={t("admin.store.title")}
        description={t("admin.store.subtitle")}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={Boxes}
          label={t("admin.store.stockValue")}
          value={formatMNTCompact(stockValue, locale)}
          hint={t("admin.store.partCount", { count: parts.length })}
          tone="brand"
        />
        <StatTile
          icon={Package}
          label={t("admin.store.lowStock")}
          value={lowStock.length}
          hint={t("admin.store.lowStockHint", { count: LOW_STOCK_AT })}
          tone="accent"
        />
        <StatTile
          icon={ShoppingBag}
          label={t("admin.store.toShip")}
          value={toShip}
          tone="neutral"
        />
        <StatTile
          icon={Wrench}
          label={t("admin.store.openRequests")}
          value={openRequests}
          tone="positive"
        />
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{t("admin.store.requests")}</CardTitle>
          <span className="text-[12px] font-semibold text-ink-500">
            {requests.length}
          </span>
        </CardHeader>

        {requests.length === 0 ? (
          <CardBody>
            <EmptyState
              icon={<Wrench className="size-8" />}
              title={t("admin.store.noRequests")}
            />
          </CardBody>
        ) : (
          <div className="divide-y divide-ink-200/70">
            {requests.map((request) => (
              <div key={request.id} className="flex flex-col gap-2 px-5 py-3.5">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone={REQUEST_TONE[request.status]}>
                    {t(`store.serviceStatus.${request.status}`)}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-ink-900">
                    {t(`equipment.category.${request.category}`)}
                    {request.equipment
                      ? ` · ${request.equipment.make} ${request.equipment.model}`
                      : ""}
                  </span>
                  <span className="shrink-0 text-[12px] text-ink-500">
                    {request.requester?.name ?? "—"}
                    {request.requester ? ` · ${request.requester.phone}` : ""}
                  </span>
                  <span className="w-24 shrink-0 text-right text-[12px] text-ink-400">
                    {formatDate(request.createdAt, locale)}
                  </span>
                </div>

                <p className="text-[13px] leading-relaxed text-ink-600">
                  {request.description}
                </p>

                <RequestStatusActions requestId={request.id} status={request.status} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{t("admin.store.orders")}</CardTitle>
          <span className="text-[12px] font-semibold text-ink-500">
            {orders.length}
          </span>
        </CardHeader>

        {orders.length === 0 ? (
          <CardBody>
            <EmptyState
              icon={<ShoppingBag className="size-8" />}
              title={t("admin.store.noOrders")}
            />
          </CardBody>
        ) : (
          <div className="divide-y divide-ink-200/70">
            {orders.map((order) => (
              <div key={order.id} className="flex flex-col gap-2 px-5 py-3.5">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone={ORDER_TONE[order.status]}>
                    {t(`store.orderStatus.${order.status}`)}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-ink-900">
                    {t("store.orderNumber", {
                      id: order.id.slice(-6).toUpperCase(),
                    })}{" "}
                    · {order.user.name}
                  </span>
                  <span className="shrink-0 text-[14px] font-extrabold text-ink-900 tabular">
                    {formatMNT(order.totalAmount, locale)}
                  </span>
                  <span className="w-24 shrink-0 text-right text-[12px] text-ink-400">
                    {formatDate(order.createdAt, locale)}
                  </span>
                </div>

                <p className="truncate text-[12px] text-ink-500">
                  {order.items
                    .map(
                      (item) =>
                        `${item.quantity} × ${partName(item.part, locale)}`,
                    )
                    .join(" · ")}
                  {order.address ? ` · ${order.address}` : ""}
                </p>

                <OrderStatusActions orderId={order.id} status={order.status} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.store.inventory")}</CardTitle>
          <span className="text-[12px] font-semibold text-ink-500">
            {t("admin.store.inventoryHint")}
          </span>
        </CardHeader>

        <div className="divide-y divide-ink-200/70">
          {parts.map((part) => (
            <div
              key={part.id}
              className="flex flex-wrap items-center gap-3 px-5 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-ink-900">
                  {partName(part, locale)}
                  {part.active ? null : (
                    <span className="pl-2 text-[12px] font-semibold text-ink-400">
                      {t("admin.store.unlisted")}
                    </span>
                  )}
                </p>
                <p className="truncate text-[12px] text-ink-500 tabular">
                  {part.sku} · {t(`store.partCategory.${part.category}`)} ·{" "}
                  {t("admin.store.onHand", { count: part.stock })}
                </p>
              </div>

              <PartEditor
                partId={part.id}
                price={part.price}
                stock={part.stock}
                active={part.active}
              />
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
