import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthCard, AuthLayout } from "@/components/auth/auth-card";
import { phoneLoginBlocked } from "@/lib/auth/demo-gate";
import { LoginForm } from "./login-form";

// Reads an environment variable to decide whether to redirect, so it cannot be
// prerendered into a static page that answers from the wrong side of the gate.
export const dynamic = "force-dynamic";

export default async function LoginPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  // With the demo password up, this is the door that has to stay shut.
  if (phoneLoginBlocked()) redirect(`/${locale}/demo`);

  const t = await getTranslations("auth");
  const tDemo = await getTranslations("demo");

  return (
    <AuthLayout>
      <AuthCard
        title={t("loginTitle")}
        description={t("loginSubtitle")}
        footer={
          <Link
            href="/demo"
            className="text-[13px] font-bold text-brand-600 hover:text-brand-700"
          >
            {tDemo("title")} →
          </Link>
        }
      >
        <LoginForm />
      </AuthCard>
    </AuthLayout>
  );
}
