import { getTranslations, setRequestLocale } from "next-intl/server";
import { Star } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { requireRole } from "@/lib/auth/guards";
import { getReviewsFor } from "@/lib/bookings/queries";
import { formatDate } from "@/lib/dates";

export default async function CompanyReviewsPage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireRole(locale, "COMPANY");
  const t = await getTranslations();
  const { given, received } = await getReviewsFor(session.uid, session.role);

  if (given.length === 0 && received.length === 0) {
    return (
      <>
        <PageHeader title={t("nav.company.reviews")} description={t("review.subtitle")} />
        <EmptyState icon={<Star className="size-8" />} title={t("review.empty")} />
      </>
    );
  }

  return (
    <>
      <PageHeader title={t("nav.company.reviews")} description={t("review.subtitle")} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("review.given")}</CardTitle>
          </CardHeader>
          {given.length ? (
            <div className="divide-y divide-ink-200/70">
              {given.map((review) => (
                <div key={review.id} className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[13px] font-bold text-ink-900">
                      <Star className="size-3.5 fill-accent-400 text-accent-400" />
                      {review.rating}
                    </span>
                    <span className="truncate text-[13px] text-ink-600">
                      {review.booking.order.title}
                    </span>
                    <Badge tone="neutral" className="ml-auto shrink-0">
                      {t(`review.${review.subjectType.toLowerCase()}`)}
                    </Badge>
                  </div>
                  {review.comment ? (
                    <p className="mt-1 text-[13px] text-ink-600">{review.comment}</p>
                  ) : null}
                  <p className="mt-0.5 text-[12px] text-ink-400">
                    {formatDate(review.createdAt, locale)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <CardBody>
              <p className="text-[13px] text-ink-500">{t("review.empty")}</p>
            </CardBody>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("review.received")}</CardTitle>
          </CardHeader>
          {received.length ? (
            <div className="divide-y divide-ink-200/70">
              {received.map((review) => (
                <div key={review.id} className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[13px] font-bold text-ink-900">
                      <Star className="size-3.5 fill-accent-400 text-accent-400" />
                      {review.rating}
                    </span>
                    <span className="truncate text-[13px] font-semibold text-ink-600">
                      {review.author.name}
                    </span>
                  </div>
                  {review.comment ? (
                    <p className="mt-1 text-[13px] text-ink-600">{review.comment}</p>
                  ) : null}
                  <p className="mt-0.5 text-[12px] text-ink-400">
                    {formatDate(review.createdAt, locale)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <CardBody>
              <p className="text-[13px] text-ink-500">{t("review.empty")}</p>
            </CardBody>
          )}
        </Card>
      </div>
    </>
  );
}
