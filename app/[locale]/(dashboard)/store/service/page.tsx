import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarClock, Wrench, X } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/feedback";
import { ServiceRequestForm } from "@/components/store/service-request-form";
import { StoreTabs } from "@/components/store/store-tabs";
import { cancelServiceRequestAction } from "../actions";
import { requireSession } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { getOwnEquipment, getServiceRequests } from "@/lib/store/queries";
import type { ServiceRequestStatus } from "@/lib/generated/prisma/enums";

const STATUS_TONE: Record<
  ServiceRequestStatus,
  "brand" | "positive" | "caution" | "neutral"
> = {
  OPEN: "caution",
  SCHEDULED: "brand",
  DONE: "positive",
  CANCELLED: "neutral",
};

export default async function ServiceRequestsPage({
  params,
}: PageProps<"/[locale]/store/service">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireSession(locale);
  const t = await getTranslations("store");
  const tt = await getTranslations();

  const [requests, equipment] = await Promise.all([
    getServiceRequests(session.uid),
    // Only owners have machines to attach; everyone else gets the plain form.
    session.role === "OWNER" ? getOwnEquipment(session.uid) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader title={t("serviceTitle")} description={t("serviceSubtitle")} />

      <StoreTabs />

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ServiceRequestForm equipment={equipment} />
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("myRequests")}</CardTitle>
              <span className="text-[12px] font-semibold text-ink-500">
                {requests.length}
              </span>
            </CardHeader>

            {requests.length === 0 ? (
              <CardBody>
                <EmptyState
                  icon={<Wrench className="size-8" />}
                  title={t("noRequests")}
                  description={t("noRequestsHint")}
                />
              </CardBody>
            ) : (
              <div className="divide-y divide-ink-200/70">
                {requests.map((request) => (
                  <div key={request.id} className="flex flex-col gap-2 px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[13px] font-bold text-ink-900">
                        {tt(`equipment.category.${request.category}`)}
                        {request.equipment
                          ? ` · ${request.equipment.make} ${request.equipment.model}`
                          : ""}
                      </p>
                      <Badge tone={STATUS_TONE[request.status]}>
                        {t(`serviceStatus.${request.status}`)}
                      </Badge>
                    </div>

                    <p className="text-[13px] leading-relaxed text-ink-600">
                      {request.description}
                    </p>

                    <p className="flex flex-wrap items-center gap-x-3 text-[12px] text-ink-400">
                      <span>{formatDate(request.createdAt, locale)}</span>
                      {request.preferredAt ? (
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="size-3.5" />
                          {formatDate(request.preferredAt, locale)}
                        </span>
                      ) : null}
                    </p>

                    {request.status === "OPEN" ? (
                      <div>
                        <ConfirmButton
                          action={cancelServiceRequestAction.bind(
                            null,
                            locale,
                            request.id,
                          )}
                          label={tt("common.cancel")}
                          icon={<X />}
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
