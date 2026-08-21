import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { EquipmentForm } from "@/components/equipment/equipment-form";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export default async function EditEquipmentPage({
  params,
}: PageProps<"/[locale]/owner/equipment/[id]/edit">) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const session = await requireRole(locale, "OWNER");
  const t = await getTranslations("owner");

  const equipment = await db.equipment.findUnique({ where: { id } });
  if (!equipment || equipment.ownerId !== session.uid) notFound();

  const specs = (equipment.specs ?? {}) as Record<string, string>;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t("editEquipment")}
        description={`${equipment.make} ${equipment.model}`}
      />
      <EquipmentForm
        equipmentId={equipment.id}
        defaults={{
          category: equipment.category,
          make: equipment.make,
          model: equipment.model,
          year: equipment.year,
          hourlyRate: equipment.hourlyRate,
          dailyRate: equipment.dailyRate,
          monthlyRate: equipment.monthlyRate,
          aimag: equipment.aimag,
          district: equipment.district ?? "",
          description: equipment.description ?? "",
          withOperator: equipment.withOperator,
          status: equipment.status as "ACTIVE" | "MAINTENANCE" | "INACTIVE",
          photos: equipment.photos,
          specs: Object.entries(specs).map(([name, value]) => ({ name, value })),
        }}
      />
    </div>
  );
}
