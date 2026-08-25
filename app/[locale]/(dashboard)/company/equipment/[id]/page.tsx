import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MapPin, Star, UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EquipmentThumb } from "@/components/equipment/equipment-thumb";
import { MapPanel } from "@/components/map/map-panel";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { formatPlace } from "@/lib/locations";
import { formatMNT } from "@/lib/money";

export default async function CompanyEquipmentPage({
  params,
}: PageProps<"/[locale]/company/equipment/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireRole(locale, "COMPANY");

  const t = await getTranslations();

  const equipment = await db.equipment.findUnique({
    where: { id },
    include: { owner: { include: { ownerProfile: true } } },
  });

  if (!equipment || equipment.status !== "ACTIVE") notFound();

  const specs = (equipment.specs ?? {}) as Record<string, string>;

  const reviews = await db.review.findMany({
    where: { subjectType: "EQUIPMENT", subjectId: equipment.id },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <>
      <PageHeader
        title={`${equipment.make} ${equipment.model}`}
        description={t(`equipment.category.${equipment.category}`)}
        actions={
          <Link
            href={`/company/orders/new?equipment=${equipment.id}`}
            className={buttonVariants()}
          >
            {t("company.search.orderThis")}
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            <EquipmentThumb
              category={equipment.category}
              photo={equipment.photos[0]}
              className="aspect-[16/9] w-full"
              iconClassName="size-16"
            />
          </Card>

          {equipment.description ? (
            <Card className="mt-4">
              <CardBody>
                <p className="text-[14px] leading-relaxed text-ink-700">
                  {equipment.description}
                </p>
              </CardBody>
            </Card>
          ) : null}

          <Card className="mt-4 overflow-hidden">
            <CardHeader>
              <CardTitle>{t("equipment.location")}</CardTitle>
            </CardHeader>
            <MapPanel
              pins={[
                {
                  id: equipment.id,
                  lat: equipment.lat,
                  lng: equipment.lng,
                  category: equipment.category,
                  make: equipment.make,
                  model: equipment.model,
                  dailyRate: equipment.dailyRate,
                  aimag: equipment.aimag,
                  district: equipment.district,
                  ratingAvg: equipment.ratingAvg,
                  ratingCount: equipment.ratingCount,
                },
              ]}
              hrefBase="/company/equipment"
              className="h-72 w-full"
            />
          </Card>

          {reviews.length ? (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>{t("equipment.rating")}</CardTitle>
              </CardHeader>
              <div className="divide-y divide-ink-200/70">
                {reviews.map((review) => (
                  <div key={review.id} className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[13px] font-bold text-ink-900">
                        <Star className="size-3.5 fill-accent-400 text-accent-400" />
                        {review.rating}
                      </span>
                      <span className="text-[13px] font-semibold text-ink-600">
                        {review.author.name}
                      </span>
                    </div>
                    {review.comment ? (
                      <p className="mt-1 text-[13px] text-ink-600">{review.comment}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardBody className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={equipment.withOperator ? "brand" : "neutral"}>
                  <UserRound className="size-3" />
                  {equipment.withOperator
                    ? t("equipment.withOperator")
                    : t("equipment.withoutOperator")}
                </Badge>
                {equipment.ratingCount > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[13px] font-bold text-ink-700">
                    <Star className="size-3.5 fill-accent-400 text-accent-400" />
                    <span className="tabular">{equipment.ratingAvg.toFixed(1)}</span>
                    <span className="font-semibold text-ink-400">
                      ({equipment.ratingCount})
                    </span>
                  </span>
                ) : null}
              </div>

              <dl className="flex flex-col gap-2.5 border-t border-ink-200/70 pt-3">
                <Row
                  label={t("common.perHour")}
                  value={formatMNT(equipment.hourlyRate, locale)}
                />
                <Row
                  label={t("common.perDay")}
                  value={formatMNT(equipment.dailyRate, locale)}
                />
                <Row
                  label={t("common.perMonth")}
                  value={formatMNT(equipment.monthlyRate, locale)}
                  emphasis
                />
              </dl>

              <dl className="flex flex-col gap-2.5 border-t border-ink-200/70 pt-3">
                <Row label={t("equipment.year")} value={String(equipment.year)} />
                <Row
                  label={t("equipment.location")}
                  value={formatPlace(equipment.aimag, equipment.district, locale)}
                  icon={<MapPin className="size-3.5 text-ink-400" />}
                />
                <Row
                  label={t("roles.OWNER")}
                  value={
                    equipment.owner.ownerProfile?.companyName ?? equipment.owner.name
                  }
                />
              </dl>
            </CardBody>
          </Card>

          {Object.keys(specs).length ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("equipment.specs")}</CardTitle>
              </CardHeader>
              <CardBody>
                <dl className="flex flex-col gap-2.5">
                  {Object.entries(specs).map(([name, value]) => (
                    <Row key={name} label={name} value={value} />
                  ))}
                </dl>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  emphasis,
  icon,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="inline-flex items-center gap-1.5 text-[13px] text-ink-500">
        {icon}
        {label}
      </dt>
      <dd
        className={
          emphasis
            ? "text-[15px] font-extrabold text-ink-900 tabular"
            : "text-[13px] font-bold text-ink-800 tabular"
        }
      >
        {value}
      </dd>
    </div>
  );
}
