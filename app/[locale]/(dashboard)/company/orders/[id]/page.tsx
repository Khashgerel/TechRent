import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays, MapPin, SearchX, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { OfferCard, type Offer } from "@/components/company/offer-card";
import { RerunButton } from "@/components/company/rerun-button";
import { requireRole } from "@/lib/auth/guards";
import { getCompanyOrder } from "@/lib/company/queries";
import { runMatchingDetailed } from "@/lib/matching/service";
import { formatRange } from "@/lib/dates";
import { formatPlace } from "@/lib/locations";
import { formatMNT } from "@/lib/money";

type StoredBreakdown = {
  factors?: Offer["factors"];
  quotedAmount?: number;
  days?: number;
};

export default async function CompanyOrderPage({
  params,
}: PageProps<"/[locale]/company/orders/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const session = await requireRole(locale, "COMPANY");
  const t = await getTranslations();

  const order = await getCompanyOrder(id, session.uid);
  if (!order) notFound();

  const offers: Offer[] = order.matches.map((match) => {
    const breakdown = (match.breakdown ?? {}) as StoredBreakdown;

    return {
      id: match.id,
      status: match.status,
      score: match.score,
      distanceKm: match.distanceKm,
      quotedAmount: match.quotedAmount,
      days: breakdown.days ?? 1,
      factors: breakdown.factors ?? [],
      equipment: match.equipment
        ? {
            id: match.equipment.id,
            category: match.equipment.category,
            make: match.equipment.make,
            model: match.equipment.model,
            aimag: match.equipment.aimag,
            district: match.equipment.district,
            photos: match.equipment.photos,
            ratingAvg: match.equipment.ratingAvg,
            ratingCount: match.equipment.ratingCount,
            ownerName:
              match.equipment.owner.ownerProfile?.companyName ??
              match.equipment.owner.name,
          }
        : null,
      operatorName: match.operator?.user.name ?? null,
      operatorLevel: match.operator?.level ?? null,
    };
  });

  const live = offers.filter((o) => o.status !== "DECLINED");
  const declined = offers.filter((o) => o.status === "DECLINED");

  // Only worth re-running the engine when the client is looking at nothing.
  const diagnosis = live.length
    ? { rejectedBy: {} as Record<string, number>, categoryTotal: 0 }
    : await runMatchingDetailed(order.id);

  return (
    <>
      <PageHeader
        title={order.title}
        description={t(`equipment.category.${order.category}`)}
        actions={<RerunButton orderId={order.id} />}
      />

      <Card className="mb-5">
        <CardBody className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <Fact
            icon={<CalendarDays className="size-4 text-ink-400" />}
            label={t("company.orders.period")}
            value={formatRange(order.startDate, order.endDate, locale)}
          />
          <Fact
            icon={<MapPin className="size-4 text-ink-400" />}
            label={t("equipment.location")}
            value={formatPlace(order.aimag, order.district, locale)}
          />
          {order.budgetMax ? (
            <Fact
              icon={<Wallet className="size-4 text-ink-400" />}
              label={t("company.orders.budget")}
              value={`${order.budgetMin ? `${formatMNT(order.budgetMin, locale)} – ` : ""}${formatMNT(order.budgetMax, locale)}`}
            />
          ) : null}
          <Badge tone="brand" className="ml-auto">
            {t(`orderStatus.${order.status}`)}
          </Badge>
        </CardBody>
      </Card>

      {order.description ? (
        <Card className="mb-5">
          <CardBody>
            <p className="text-[14px] leading-relaxed text-ink-700">
              {order.description}
            </p>
          </CardBody>
        </Card>
      ) : null}

      <h2 className="mb-3 text-[15px] font-extrabold tracking-tight text-ink-900">
        {t("company.offers.title")}
        {live.length ? (
          <span className="ml-2 text-[13px] font-semibold text-ink-500">
            {t("company.offers.subtitle", { count: live.length })}
          </span>
        ) : null}
      </h2>

      {live.length ? (
        <div className="flex flex-col gap-3">
          {live.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <EmptyState
            icon={<SearchX className="size-8" />}
            title={t("company.offers.empty")}
            description={t("company.offers.emptyHint")}
          />

          {/* An empty result is a finding, not a dead end — say which gate
              filtered everything out so the client can adjust the right thing. */}
          <Card>
            <CardBody>
              <p className="text-[13px] font-bold text-ink-900">
                {t("company.offers.whyEmpty")}
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-[13px] text-ink-600">
                <li>{t("company.offers.poolSize", { count: diagnosis.categoryTotal })}</li>
                {diagnosis.rejectedBy.unavailable ? (
                  <li>
                    {t("company.offers.rejectedUnavailable", {
                      count: diagnosis.rejectedBy.unavailable,
                    })}
                  </li>
                ) : null}
                {diagnosis.rejectedBy.no_operator ? (
                  <li>
                    {t("company.offers.rejectedNoOperator", {
                      count: diagnosis.rejectedBy.no_operator,
                    })}
                  </li>
                ) : null}
                {diagnosis.rejectedBy.status ? (
                  <li>
                    {t("company.offers.rejectedStatus", {
                      count: diagnosis.rejectedBy.status,
                    })}
                  </li>
                ) : null}
              </ul>
              <p className="mt-2 text-[13px] font-semibold text-brand-700">
                {t("company.offers.suggestion")}
              </p>
            </CardBody>
          </Card>
        </div>
      )}

      {declined.length ? (
        <div className="mt-6">
          <h3 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-ink-500">
            {t("company.offers.declined")}
          </h3>
          <div className="flex flex-col gap-3">
            {declined.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-500">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-[14px] font-bold text-ink-900">{value}</p>
    </div>
  );
}
