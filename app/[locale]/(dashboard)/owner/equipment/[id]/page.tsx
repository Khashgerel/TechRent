import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays, MapPin, Pencil, Star, Trash2, UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/feedback";
import { BookingRow } from "@/components/bookings/booking-row";
import { EquipmentThumb } from "@/components/equipment/equipment-thumb";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { STATUS_TONE } from "@/lib/equipment";
import { formatPlace } from "@/lib/locations";
import { formatMNT } from "@/lib/money";
import { deleteEquipmentAction } from "../actions";

export default async function EquipmentDetailPage({
  params,
}: PageProps<"/[locale]/owner/equipment/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const session = await requireRole(locale, "OWNER");
  const t = await getTranslations();

  const equipment = await db.equipment.findUnique({
    where: { id },
    include: {
      bookings: {
        include: {
          order: { include: { company: { include: { companyProfile: true } } } },
          operator: { include: { user: true } },
        },
        orderBy: { startDate: "desc" },
        take: 10,
      },
    },
  });

  if (!equipment || equipment.ownerId !== session.uid) notFound();

  const specs = (equipment.specs ?? {}) as Record<string, string>;
  const specEntries = Object.entries(specs);

  const earned = equipment.bookings
    .filter((b) => b.status === "PAID")
    .reduce((sum, b) => sum + b.ownerPayout, 0);

  return (
    <>
      <PageHeader
        title={`${equipment.make} ${equipment.model}`}
        description={t(`equipment.category.${equipment.category}`)}
        actions={
          <>
            <Link
              href={`/owner/equipment/${equipment.id}/edit`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Pencil className="size-4" />
              {t("common.edit")}
            </Link>
            <ConfirmButton
              action={deleteEquipmentAction.bind(null, locale, equipment.id)}
              label={t("common.delete")}
              icon={<Trash2 />}
            />
          </>
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
            {equipment.photos.length > 1 ? (
              <div className="flex gap-2 border-t border-ink-200/70 p-3">
                {equipment.photos.slice(1, 6).map((photo, index) => (
                  <EquipmentThumb
                    key={index}
                    category={equipment.category}
                    photo={photo}
                    className="size-16 rounded-[10px]"
                  />
                ))}
              </div>
            ) : null}
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

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{t("owner.bookings.title")}</CardTitle>
            </CardHeader>
            {equipment.bookings.length ? (
              <div>
                {equipment.bookings.map((booking) => (
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
                      category: equipment.category,
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

        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardBody className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={STATUS_TONE[equipment.status]}>
                  {t(`equipment.status.${equipment.status}`)}
                </Badge>
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
                <Row label={t("common.perHour")} value={formatMNT(equipment.hourlyRate, locale)} />
                <Row label={t("common.perDay")} value={formatMNT(equipment.dailyRate, locale)} />
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
                  label={t("owner.earnings.lifetime")}
                  value={formatMNT(earned, locale)}
                />
              </dl>
            </CardBody>
          </Card>

          {specEntries.length ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("equipment.specs")}</CardTitle>
              </CardHeader>
              <CardBody>
                <dl className="flex flex-col gap-2.5">
                  {specEntries.map(([name, value]) => (
                    <Row key={name} label={name} value={value} />
                  ))}
                </dl>
              </CardBody>
            </Card>
          ) : null}

          <Link
            href="/owner/calendar"
            className={buttonVariants({ variant: "outline", full: true })}
          >
            <CalendarDays className="size-4" />
            {t("nav.owner.calendar")}
          </Link>
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
