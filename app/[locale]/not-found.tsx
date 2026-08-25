import { getTranslations } from "next-intl/server";
import { Compass } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/shell/logo";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";

/**
 * A wrong URL inside a locale. Rendered outside the dashboard shell, so it
 * carries its own header and a way back to the demo entry point.
 */
export default async function LocaleNotFound() {
  const t = await getTranslations("errors");

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-5">
      <Logo />

      <EmptyState
        className="w-full"
        icon={<Compass className="size-8" />}
        title={t("notFoundTitle")}
        description={t("notFoundBody")}
        action={
          <Link href="/demo" className={buttonVariants({ size: "sm" })}>
            {t("backToDemo")}
          </Link>
        }
      />
    </main>
  );
}
