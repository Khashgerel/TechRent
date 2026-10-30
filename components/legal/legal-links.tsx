import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * Privacy and terms, for the foot of the sign-in cards — the one place a
 * visitor without an account can find them.
 */
export async function LegalLinks() {
  const t = await getTranslations("legal");

  return (
    <p className="text-[13px] text-ink-500">
      <Link
        href="/privacy"
        className="font-semibold transition-colors hover:text-ink-900"
      >
        {t("privacyTitle")}
      </Link>
      <span className="px-2 text-ink-300">·</span>
      <Link
        href="/terms"
        className="font-semibold transition-colors hover:text-ink-900"
      >
        {t("termsTitle")}
      </Link>
    </p>
  );
}
