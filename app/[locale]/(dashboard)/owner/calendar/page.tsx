import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/feedback";
import { AvailabilityTimeline } from "@/components/owner/availability-timeline";
import { BlockManager } from "@/components/owner/block-manager";
import { requireRole } from "@/lib/auth/guards";
import { getOwnerCalendar } from "@/lib/owner/queries";

export default async function OwnerCalendarPage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireRole(locale, "OWNER");
  const t = await getTranslations("owner.calendar");
  const { equipment, bookings, blocks } = await getOwnerCalendar(session.uid);

  if (!equipment.length) {
    return (
      <>
        <PageHeader title={t("title")} description={t("subtitle")} />
        <EmptyState
          icon={<CalendarDays className="size-8" />}
          title={t("noBlocks")}
        />
      </>
    );
  }

  // Dates cross the server/client boundary as ISO strings.
  const serialise = <T extends { startDate: Date; endDate: Date }>(row: T) => ({
    ...row,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString(),
  });

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />

      <AvailabilityTimeline
        equipment={equipment}
        bookings={bookings.map((b) => ({
          ...serialise(b),
          title: b.order.title,
        }))}
        blocks={blocks.map(serialise)}
      />

      <div className="mt-4 max-w-2xl">
        <BlockManager equipment={equipment} blocks={blocks.map(serialise)} />
      </div>
    </>
  );
}
