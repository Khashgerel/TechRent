import { getTranslations, setRequestLocale } from "next-intl/server";
import { getFormatter } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { EquipmentReview } from "@/components/admin/equipment-review";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { formatMNT } from "@/lib/money";
import { formatPlace } from "@/lib/locations";

export const dynamic = "force-dynamic";

/**
 * Machines waiting on a human.
 *
 * `PENDING_REVIEW` has existed since the first migration with nothing able to
 * clear it; this is where it finally gets cleared.
 */
export default async function AdminEquipmentPage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireRole(locale, "ADMIN");

  const t = await getTranslations("admin.equipment");
  const tCat = await getTranslations("equipment.category");
  const format = await getFormatter();

  const pending = await db.equipment.findMany({
    where: { status: "PENDING_REVIEW" },
    include: {
      owner: {
        select: { name: true, verification: true, ownerProfile: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <PageHeader title={t("title")} description={t("subtitle")} />

      {pending.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((item) => (
            <Card key={item.id}>
              <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-bold text-ink-900">
                      {item.make} {item.model}
                    </span>
                    <Badge tone="neutral">{tCat(item.category)}</Badge>
                    <Badge tone="caution">{t("waiting")}</Badge>
                  </div>
                  <p className="mt-1 text-[13px] text-ink-500">
                    {item.owner.ownerProfile?.companyName ?? item.owner.name} ·{" "}
                    {formatPlace(item.aimag, item.district, locale)} ·{" "}
                    {formatMNT(item.dailyRate, locale)}
                    {t("perDay")}
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-400">
                    {t("listed", {
                      when: format.relativeTime(item.createdAt),
                    })}
                  </p>
                </div>

                <EquipmentReview equipmentId={item.id} />
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
