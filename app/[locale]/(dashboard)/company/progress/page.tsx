import { getTranslations, setRequestLocale } from "next-intl/server";
import { BadgeCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { BookingRow } from "@/components/bookings/booking-row";
import { requireRole } from "@/lib/auth/guards";
import { getCompanyBookings } from "@/lib/bookings/queries";
import type { BookingStatus } from "@/lib/generated/prisma/enums";

const ACTIVE: BookingStatus[] = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"];

export default async function CompanyProgressPage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireRole(locale, "COMPANY");
  const t = await getTranslations();
  const bookings = await getCompanyBookings(session.uid);

  const active = bookings.filter((b) => ACTIVE.includes(b.status));
  const finished = bookings.filter((b) => !ACTIVE.includes(b.status));

  const toRow = (booking: (typeof bookings)[number]) => ({
    id: booking.id,
    status: booking.status,
    startDate: booking.startDate,
    endDate: booking.endDate,
    totalAmount: booking.totalAmount,
    title: booking.order.title,
    counterparty: booking.equipment
      ? `${booking.equipment.make} ${booking.equipment.model}`
      : "",
    operatorName: booking.operator?.user.name,
    category: booking.equipment?.category ?? ("EXCAVATOR" as const),
    photo: booking.equipment?.photos[0],
  });

  return (
    <>
      <PageHeader
        title={t("companyProgress.title")}
        description={t("companyProgress.subtitle")}
        actions={
          <Link href="/company/orders/new" className={buttonVariants()}>
            {t("company.orders.create")}
          </Link>
        }
      />

      {bookings.length === 0 ? (
        <EmptyState
          icon={<BadgeCheck className="size-8" />}
          title={t("companyProgress.empty")}
          description={t("companyProgress.emptyHint")}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {active.length ? (
            <section>
              <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-ink-500">
                {t("companyProgress.active")}
              </h2>
              <Card>
                {active.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/company/progress/${booking.id}`}
                    className="block transition-colors hover:bg-ink-50/70"
                  >
                    <BookingRow booking={toRow(booking)} />
                  </Link>
                ))}
              </Card>
            </section>
          ) : null}

          {finished.length ? (
            <section>
              <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-ink-500">
                {t("companyProgress.finished")}
              </h2>
              <Card>
                {finished.slice(0, 30).map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/company/progress/${booking.id}`}
                    className="block transition-colors hover:bg-ink-50/70"
                  >
                    <BookingRow booking={toRow(booking)} />
                  </Link>
                ))}
              </Card>
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}
