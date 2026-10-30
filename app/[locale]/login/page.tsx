import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard, AuthLayout } from "@/components/auth/auth-card";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { LegalLinks } from "@/components/legal/legal-links";
import { Alert } from "@/components/ui/feedback";
import { oauthEnabled } from "@/lib/auth/oauth";

// Reads environment variables to decide what to render, so it cannot be
// prerendered into a page that answers from the wrong side of the config.
export const dynamic = "force-dynamic";

const ERRORS = new Set([
  "oauthDenied",
  "oauthState",
  "oauthProfile",
  "oauthFailed",
  "suspended",
]);

/**
 * Signing in to the marketplace.
 *
 * Social sign-in only: phone + OTP was removed with demo mode, because it
 * could never send a code without an SMS gateway. Staff sign in separately at
 * `/[locale]/staff-login` with a username and password.
 */
export default async function LoginPage({
  params,
  searchParams,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  // With no provider configured there is no way to sign in at all, which is a
  // deployment problem rather than something to render a dead page for.
  if (!oauthEnabled()) redirect(`/${locale}/staff-login`);

  const { error: rawError } = await searchParams;
  const error =
    typeof rawError === "string" && ERRORS.has(rawError) ? rawError : null;

  const t = await getTranslations("auth");

  return (
    <AuthLayout>
      <AuthCard
        title={t("loginTitle")}
        description={t("socialOnlySubtitle")}
        footer={<LegalLinks />}
      >
        {error ? (
          <Alert tone="critical" className="mb-5">
            {t(`errors.${error}`)}
          </Alert>
        ) : null}

        <OAuthButtons locale={locale} label={t("orContinueWith")} />
      </AuthCard>
    </AuthLayout>
  );
}
