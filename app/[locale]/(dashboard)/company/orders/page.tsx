import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays, ClipboardList, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { CATEGORY_ICON } from "@/components/equipment/category-icon";
import { requireRole } from "@/lib/auth/guards";
import { getCompanyOrders } from "@/lib/company/queries";
import { formatRange } from "@/lib/dates";
import { formatPlace } from "@/lib/locations";

export default async function CompanyOrdersPage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireRole(locale, "COMPANY");
  const t = await getTranslations();
  const orders = await getCompanyOrders(session.uid);

  return (
    <>
      <PageHeader
        title={t("company.orders.title")}
        description={t("company.orders.subtitle")}
        actions={
          <Link href="/company/orders/new" className={buttonVariants()}>
            {t("company.orders.create")}
          </Link>
        }
      />

      {orders.length ? (
        <Card>
          {orders.map((order) => {
            const Icon = CATEGORY_ICON[order.category];
            const live = order.matches.filter((m) => m.status !== "DECLINED").length;

            return (
              <Link
                key={order.id}
                href={`/company/orders/${order.id}`}
                className="flex items-center gap-4 border-b border-ink-200/70 px-4 py-3.5 transition-colors last:border-0 hover:bg-ink-50/70"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-brand-50 text-brand-600">
                  <Icon className="size-5" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold text-ink-900">
                    {order.title}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-ink-500">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      {formatRange(order.startDate, order.endDate, locale)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" />
                      {formatPlace(order.aimag, order.district, locale)}
                    </span>
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span className="block text-[13px] font-bold text-ink-800">
                    {live
                      ? t("company.orders.matchCount", { count: live })
                      : t("company.orders.noMatches")}
                  </span>
                  <Badge
                    tone={
                      order.status === "PAID" || order.status === "VERIFIED"
                        ? "positive"
                        : order.status === "CANCELLED"
                          ? "critical"
                          : "brand"
                    }
                    className="mt-1"
                  >
                    {t(`orderStatus.${order.status}`)}
                  </Badge>
                </span>
              </Link>
            );
          })}
        </Card>
      ) : (
        <EmptyState
          icon={<ClipboardList className="size-8" />}
          title={t("company.orders.empty")}
          description={t("company.orders.emptyHint")}
          action={
            <Link
              href="/company/orders/new"
              className={buttonVariants({ size: "sm" })}
            >
              {t("company.orders.create")}
            </Link>
          }
        />
      )}
    </>
  );
}
