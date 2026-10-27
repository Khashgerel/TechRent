import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthCard, AuthLayout } from "@/components/auth/auth-card";
import { Alert } from "@/components/ui/feedback";
import { phoneLoginBlocked } from "@/lib/auth/demo-gate";
import { readDemoOtp } from "@/lib/auth/login-actions";
import { normalizePhone } from "@/lib/auth/otp";
import { VerifyForm } from "./verify-form";

// Reads an environment variable to decide whether to redirect, so it cannot be
// prerendered into a static page that answers from the wrong side of the gate.
export const dynamic = "force-dynamic";

export default async function VerifyPage({
  params,
  searchParams,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  // The code screen is the other half of the phone door; shut it with the first.
  if (phoneLoginBlocked()) redirect(`/${locale}/demo`);

  const { phone: rawPhone } = await searchParams;
  const phone = normalizePhone(String(rawPhone ?? ""));
  if (phone.length !== 8) redirect(`/${locale}/login`);

  const t = await getTranslations("auth");
  const demoCode = await readDemoOtp();

  return (
    <AuthLayout>
      <AuthCard
        title={t("verifyTitle")}
        description={t("verifySubtitle", { phone: `+976 ${phone}` })}
        footer={
          <Link
            href="/login"
            className="text-[13px] font-bold text-ink-500 hover:text-ink-800"
          >
            ← {t("changePhone")}
          </Link>
        }
      >
        {demoCode ? (
          <Alert tone="caution" className="mb-5 text-center font-bold">
            {t("demoCodeNotice", { code: demoCode })}
          </Alert>
        ) : null}
        <VerifyForm phone={phone} />
      </AuthCard>
    </AuthLayout>
  );
}
