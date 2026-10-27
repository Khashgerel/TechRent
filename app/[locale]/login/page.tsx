import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthCard, AuthLayout } from "@/components/auth/auth-card";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { Alert } from "@/components/ui/feedback";
import { phoneLoginBlocked } from "@/lib/auth/demo-gate";
import { oauthEnabled } from "@/lib/auth/oauth";
import { LoginForm } from "./login-form";

// Reads environment variables to decide what to render, so it cannot be
// prerendered into a static page that answers from the wrong side of the gate.
export const dynamic = "force-dynamic";

const ERRORS = new Set([
  "oauthDenied",
  "oauthState",
  "oauthProfile",
  "oauthFailed",
  "suspended",
]);

export default async function LoginPage({
  params,
  searchParams,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const phoneBlocked = phoneLoginBlocked();
  const social = oauthEnabled();

  // With the demo password up and no social provider configured there is
  // nothing to show here, so the demo picker is the only way in.
  if (phoneBlocked && !social) redirect(`/${locale}/demo`);

  const { error: rawError } = await searchParams;
  const error = typeof rawError === "string" && ERRORS.has(rawError)
    ? rawError
    : null;

  const t = await getTranslations("auth");
  const tDemo = await getTranslations("demo");

  return (
    <AuthLayout>
      <AuthCard
        title={t("loginTitle")}
        description={phoneBlocked ? t("socialOnlySubtitle") : t("loginSubtitle")}
        footer={
          <Link
            href="/demo"
            className="text-[13px] font-bold text-brand-600 hover:text-brand-700"
          >
            {tDemo("title")} →
          </Link>
        }
      >
        {error ? (
          <Alert tone="critical" className="mb-5">
            {t(`errors.${error}`)}
          </Alert>
        ) : null}

        {phoneBlocked ? null : <LoginForm />}

        {social ? (
          <div className={phoneBlocked ? "" : "mt-6"}>
            <OAuthButtons locale={locale} label={t("orContinueWith")} />
          </div>
        ) : null}
      </AuthCard>
    </AuthLayout>
  );
}
