import { getTranslations, setRequestLocale } from "next-intl/server";
import { Truck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { EquipmentCard } from "@/components/equipment/equipment-card";
import { requireRole } from "@/lib/auth/guards";
import { getOwnerEquipment } from "@/lib/owner/queries";

export default async function OwnerEquipmentPage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireRole(locale, "OWNER");
  const t = await getTranslations();
  const equipment = await getOwnerEquipment(session.uid);

  return (
    <>
      <PageHeader
        title={t("owner.myEquipment")}
        description={t("nav.owner.equipment")}
        actions={
          <Link href="/owner/equipment/new" className={buttonVariants()}>
            {t("owner.addEquipment")}
          </Link>
        }
      />

      {equipment.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {equipment.map((item) => (
            <EquipmentCard
              key={item.id}
              equipment={item}
              href={`/owner/equipment/${item.id}`}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Truck className="size-8" />}
          title={t("owner.noEquipment")}
          description={t("owner.noEquipmentHint")}
          action={
            <Link href="/owner/equipment/new" className={buttonVariants({ size: "sm" })}>
              {t("owner.addEquipment")}
            </Link>
          }
        />
      )}
    </>
  );
}
