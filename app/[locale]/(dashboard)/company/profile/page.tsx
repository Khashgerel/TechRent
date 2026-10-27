import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { CompanyProfileForm } from "@/components/company/company-profile-form";
import { Alert } from "@/components/ui/feedback";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CompanyProfilePage({
  params,
  searchParams,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Deliberately not `requireRole`: an owner or operator who wants to start
  // ordering work reaches this page to pick the role up, and saving the form
  // is what grants it.
  const session = await requireSession(locale);

  const t = await getTranslations("company.profile");
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.uid },
    include: { companyProfile: true },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("title")} description={t("subtitle")} />

      {next && !user.companyProfile ? (
        <Alert tone="caution" className="mb-5">
          {t("requiredNotice")}
        </Alert>
      ) : null}

      <CompanyProfileForm
        next={next}
        defaults={{
          companyName: user.companyProfile?.companyName ?? "",
          regNumber: user.companyProfile?.regNumber ?? "",
          industry: user.companyProfile?.industry ?? "",
          aimag: user.companyProfile?.aimag ?? "Улаанбаатар",
          district: user.companyProfile?.district ?? "",
          contactName: user.name,
          phone: user.phone ?? "",
        }}
      />
    </div>
  );
}
