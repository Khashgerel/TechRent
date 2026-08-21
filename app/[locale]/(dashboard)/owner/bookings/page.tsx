import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { BookingRow } from "@/components/bookings/booking-row";
import { requireRole } from "@/lib/auth/guards";
import { getOwnerBookings } from "@/lib/owner/queries";
import type { BookingStatus } from "@/lib/generated/prisma/enums";

/** Live work first, history after — an owner cares about what's running now. */
const ACTIVE: BookingStatus[] = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"];

export default async function OwnerBookingsPage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireRole(locale, "OWNER");
  const t = await getTranslations("owner.bookings");
  const bookings = await getOwnerBookings(session.uid);

  const active = bookings.filter((b) => ACTIVE.includes(b.status));
  const past = bookings.filter((b) => !ACTIVE.includes(b.status));

  const toRow = (booking: (typeof bookings)[number]) => ({
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
    category: booking.equipment?.category ?? ("EXCAVATOR" as const),
    equipmentName: booking.equipment
      ? `${booking.equipment.make} ${booking.equipment.model}`
      : null,
    photo: booking.equipment?.photos[0],
  });

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />

      {bookings.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-8" />}
          title={t("empty")}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {active.length ? (
            <section>
              <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-ink-500">
                {t("activeSection")}
              </h2>
              <Card>
                {active.map((booking) => (
                  <BookingRow key={booking.id} booking={toRow(booking)} />
                ))}
              </Card>
            </section>
          ) : null}

          {past.length ? (
            <section>
              <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-ink-500">
                {t("historySection")}
              </h2>
              <Card>
                {past.slice(0, 40).map((booking) => (
                  <BookingRow key={booking.id} booking={toRow(booking)} />
                ))}
              </Card>
            </section>
          ) : null}
        </div>
      )}

      {past.length > 40 ? (
        <p className="mt-4 text-center text-[13px] text-ink-500">
          {t("showingCount", { count: bookings.length })}
        </p>
      ) : null}
    </>
  );
}
