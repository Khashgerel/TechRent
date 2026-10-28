import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { OwnerForm } from "@/components/account/owner-form";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function BecomeOwnerPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireSession(locale);
  // Staff hold ADMIN and nothing else.
  if (session.roles.includes("ADMIN")) redirect(`/${locale}/admin`);

  const t = await getTranslations("account.owner");
  const existing = await db.ownerProfile.findUnique({
    where: { userId: session.uid },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <OwnerForm
        defaults={{
          companyName: existing?.companyName ?? "",
          regNumber: existing?.regNumber ?? "",
          aimag: existing?.aimag ?? "Улаанбаатар",
          district: existing?.district ?? "",
          bio: existing?.bio ?? "",
        }}
      />
    </div>
  );
}
