import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard, AuthLayout } from "@/components/auth/auth-card";
import { LegalLinks } from "@/components/legal/legal-links";
import { StaffLoginForm } from "./staff-login-form";

// Linked from nowhere and told not to be indexed: staff reach it because they
// were given the address, not because they found it.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StaffLoginPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("staffAuth");

  return (
    <AuthLayout>
      <AuthCard
        title={t("title")}
        description={t("subtitle")}
        footer={<LegalLinks />}
      >
        <StaffLoginForm />
      </AuthCard>
    </AuthLayout>
  );
}
