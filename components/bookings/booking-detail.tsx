import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, MapPin, Star, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EquipmentThumb } from "@/components/equipment/equipment-thumb";
import { BOOKING_TONE } from "./booking-row";
import { BookingActions } from "./booking-actions";
import { BookingTimeline } from "./booking-timeline";
import { EscrowPanel } from "./escrow-panel";
import { ReviewForm } from "./review-form";
import { formatRange } from "@/lib/dates";
import { formatPlace } from "@/lib/locations";
import { formatMNT } from "@/lib/money";
import type { BookingDetail as Detail } from "@/lib/bookings/queries";

/**
 * One booking view shared by all three roles. What differs between them is
 * which actions are offered and who they still owe a review — both decided in
 * the query layer, so this component stays a single presentation.
 */
export function BookingDetail({ detail }: { detail: Detail }) {
  const t = useTranslations();
  const locale = useLocale();
  const { booking, events, pendingReviews } = detail;

  const companyName =
    booking.order.company.companyProfile?.companyName ?? booking.order.company.name;
  const ownerName =
    booking.equipment?.owner.ownerProfile?.companyName ??
    booking.equipment?.owner.name;

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="flex flex-col gap-4 lg:col-span-3">
        <Card>
          <CardBody className="flex gap-4">
            {booking.equipment ? (
              <EquipmentThumb
                category={booking.equipment.category}
                photo={booking.equipment.photos[0]}
                className="size-20 shrink-0 rounded-[12px]"
                iconClassName="size-7"
              />
            ) : null}

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-bold text-ink-900">
                    {booking.order.title}
                  </p>
                  <p className="truncate text-[13px] text-ink-500">
                    {booking.equipment
                      ? `${booking.equipment.make} ${booking.equipment.model}`
                      : ""}
                  </p>
                </div>
                <Badge tone={BOOKING_TONE[booking.status]}>
                  {t(`bookingStatus.${booking.status}`)}
                </Badge>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-500">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3.5" />
                  {formatRange(booking.startDate, booking.endDate, locale)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {formatPlace(booking.order.aimag, booking.order.district, locale)}
                </span>
                {booking.operator ? (
                  <span className="inline-flex items-center gap-1">
                    <UserRound className="size-3.5" />
                    {booking.operator.user.name}
                  </span>
                ) : null}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("booking.timeline")}</CardTitle>
          </CardHeader>
          <CardBody>
            <BookingTimeline status={booking.status} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("booking.detail")}</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-2.5">
            <Row label={t("roles.COMPANY")} value={companyName} />
            {ownerName ? <Row label={t("roles.OWNER")} value={ownerName} /> : null}
            {booking.operator ? (
              <Row label={t("roles.OPERATOR")} value={booking.operator.user.name} />
            ) : null}
            <Row
              label={t("company.offers.quote")}
              value={formatMNT(booking.totalAmount, locale)}
            />
            {booking.order.description ? (
              <p className="border-t border-ink-200/70 pt-2.5 text-[13px] leading-relaxed text-ink-600">
                {booking.order.description}
              </p>
            ) : null}
          </CardBody>
        </Card>

        {booking.reviews.length ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("review.received")}</CardTitle>
            </CardHeader>
            <div className="divide-y divide-ink-200/70">
              {booking.reviews.map((review) => (
                <div key={review.id} className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[13px] font-bold text-ink-900">
                      <Star className="size-3.5 fill-accent-400 text-accent-400" />
                      {review.rating}
                    </span>
                    <span className="text-[13px] font-semibold text-ink-600">
                      {review.author.name}
                    </span>
                    <Badge tone="neutral" className="ml-auto">
                      {t(`review.${review.subjectType.toLowerCase()}`)}
                    </Badge>
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
        <EscrowPanel
          status={booking.status}
          totalAmount={booking.totalAmount}
          depositAmount={booking.depositAmount}
          commissionAmount={booking.commissionAmount}
          ownerPayout={booking.ownerPayout}
          operatorPayout={booking.operatorPayout}
          hasOperator={Boolean(booking.operatorId)}
        />

        {events.length ? (
          <Card>
            <CardBody>
              <BookingActions bookingId={booking.id} events={events} />
            </CardBody>
          </Card>
        ) : null}

        {pendingReviews.map((pending) => (
          <ReviewForm
            key={pending.subjectType}
            bookingId={booking.id}
            subjectType={pending.subjectType}
            subjectId={pending.subjectId}
            title={t(`review.${pending.subjectType.toLowerCase()}`)}
          />
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-ink-500">{label}</span>
      <span className="text-[13px] font-bold text-ink-800">{value}</span>
    </div>
  );
}
