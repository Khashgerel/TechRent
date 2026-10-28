import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { OperatorForm } from "@/components/account/operator-form";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function BecomeOperatorPage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireSession(locale);
  if (session.roles.includes("ADMIN")) redirect(`/${locale}/admin`);

  const t = await getTranslations("account.operator");
  const existing = await db.operatorProfile.findUnique({
    where: { userId: session.uid },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <OperatorForm
        defaults={{
          yearsExperience: existing?.yearsExperience ?? 3,
          skills: existing?.skills ?? [],
          aimag: existing?.aimag ?? "Улаанбаатар",
          district: existing?.district ?? "",
          dailyRate: existing?.dailyRate ?? 150000,
          available: existing?.available ?? true,
          bio: existing?.bio ?? "",
        }}
      />
    </div>
  );
}
