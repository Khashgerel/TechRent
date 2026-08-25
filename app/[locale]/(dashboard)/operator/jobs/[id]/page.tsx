import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { BookingDetail } from "@/components/bookings/booking-detail";
import { requireRole } from "@/lib/auth/guards";
import { getBookingFor } from "@/lib/bookings/queries";

export default async function OperatorJobPage({
  params,
}: PageProps<"/[locale]/operator/jobs/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const session = await requireRole(locale, "OPERATOR");
  const t = await getTranslations();

  const detail = await getBookingFor(id, { id: session.uid, role: session.role });
  if (!detail) notFound();

  return (
    <>
      <PageHeader
        title={detail.booking.order.title}
        description={t("operator.jobs.title")}
      />
      <BookingDetail detail={detail} />
    </>
  );
}
