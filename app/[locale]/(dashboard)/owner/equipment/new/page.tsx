import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { EquipmentForm } from "@/components/equipment/equipment-form";
import { requireRole } from "@/lib/auth/guards";

export default async function NewEquipmentPage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireRole(locale, "OWNER");

  const t = await getTranslations("owner");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t("newEquipment")}
        description={t("newEquipmentSub")}
      />
      <EquipmentForm />
    </div>
  );
}
