import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClipboardList } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { BookingRow } from "@/components/bookings/booking-row";
import { requireRole } from "@/lib/auth/guards";
import { getOperatorJobs } from "@/lib/bookings/queries";
import type { BookingStatus } from "@/lib/generated/prisma/enums";

const ACTIVE: BookingStatus[] = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"];

export default async function OperatorJobsPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireRole(locale, "OPERATOR");
  const t = await getTranslations();
  const jobs = await getOperatorJobs(session.uid);

  const active = jobs.filter((j) => ACTIVE.includes(j.status));
  const history = jobs.filter((j) => !ACTIVE.includes(j.status));

  const toRow = (job: (typeof jobs)[number]) => ({
    id: job.id,
    status: job.status,
    startDate: job.startDate,
    endDate: job.endDate,
    totalAmount: job.totalAmount,
    payout: job.operatorPayout,
    title: job.order.title,
    counterparty:
      job.order.company.companyProfile?.companyName ?? job.order.company.name,
    category: job.equipment?.category ?? ("EXCAVATOR" as const),
    equipmentName: job.equipment
      ? `${job.equipment.make} ${job.equipment.model}`
      : null,
    photo: job.equipment?.photos[0],
  });

  return (
    <>
      <PageHeader
        title={t("operator.jobs.title")}
        description={t("operator.jobs.subtitle")}
      />

      {jobs.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-8" />}
          title={t("operator.jobs.empty")}
          description={t("operator.jobs.emptyHint")}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {active.length ? (
            <section>
              <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-ink-500">
                {t("operator.jobs.active")}
              </h2>
              <Card>
                {active.map((job) => (
                  <Link
                    key={job.id}
                    href={`/operator/jobs/${job.id}`}
                    className="block transition-colors hover:bg-ink-50/70"
                  >
                    <BookingRow booking={toRow(job)} />
                  </Link>
                ))}
              </Card>
            </section>
          ) : null}

          {history.length ? (
            <section>
              <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-ink-500">
                {t("operator.jobs.history")}
              </h2>
              <Card>
                {history.slice(0, 30).map((job) => (
                  <Link
                    key={job.id}
                    href={`/operator/jobs/${job.id}`}
                    className="block transition-colors hover:bg-ink-50/70"
                  >
                    <BookingRow booking={toRow(job)} />
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
