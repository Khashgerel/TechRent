import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthCard, AuthLayout } from "@/components/auth/auth-card";
import { LoginForm } from "./login-form";

export default async function LoginPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
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
