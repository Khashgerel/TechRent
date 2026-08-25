import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { OrderForm } from "@/components/company/order-form";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export default async function NewOrderPage({
  params,
  searchParams,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireRole(locale, "COMPANY");

  const t = await getTranslations("company.create");
  const sp = await searchParams;
  const equipmentId = Array.isArray(sp.equipment) ? sp.equipment[0] : sp.equipment;

  // Arriving from a specific machine pre-fills the category and location, so
  // the order starts pointed at what the client was already looking at.
  const seed = equipmentId
    ? await db.equipment.findUnique({
        where: { id: equipmentId },
        select: { category: true, aimag: true, district: true, withOperator: true },
      })
    : null;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <OrderForm
        defaults={
          seed
            ? {
                category: seed.category,
                aimag: seed.aimag,
                district: seed.district ?? "",
                needsOperator: seed.withOperator,
              }
            : undefined
        }
      />
    </div>
  );
}
