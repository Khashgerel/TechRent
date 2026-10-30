import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PublicHeader } from "@/components/shell/public-header";
import { Alert } from "@/components/ui/feedback";

export type LegalDoc = "privacy" | "terms";

/** One numbered clause: its heading and the paragraphs under it. */
type Section = { title: string; body: string[] };

/**
 * Both legal documents. They differ only in which keys they read, so they share
 * one renderer.
 *
 * The clauses live in `messages/{mn,en}.json` under `legal` as arrays and are
 * read with `t.raw`, which skips ICU entirely — prose full of quotes, braces and
 * apostrophes needs no escaping, while `check:messages` still forces the two
 * languages to carry the same clauses and the same paragraphs within each.
 *
 * Nothing here reads the database or the environment, so the pages prerender.
 */
export async function LegalDocument({ doc }: { doc: LegalDoc }) {
  const t = await getTranslations("legal");
  const sections = t.raw(`${doc}Sections`) as Section[];
  const other: LegalDoc = doc === "privacy" ? "terms" : "privacy";

  return (
    <div className="relative flex min-h-dvh flex-col bg-canvas">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-brand-100/60 to-transparent" />

      <PublicHeader />

      <main className="relative mx-auto w-full max-w-[720px] flex-1 px-5 pb-20 sm:px-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-[28px]">
          {t(`${doc}Title`)}
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-500">{t("updated")}</p>

        <p className="mt-5 text-sm leading-relaxed text-ink-700">
          {t(`${doc}Intro`)}
        </p>

        {/* The platform simulates its money, so saying so belongs at the top of
            both documents rather than buried in a clause. */}
        <Alert tone="caution" title={t("demoNoticeTitle")} className="mt-5">
          <p className="mt-1 leading-relaxed">{t("demoNoticeBody")}</p>
        </Alert>

        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-[15px] font-bold tracking-tight text-ink-900">
                {section.title}
              </h2>
              <div className="mt-2 space-y-2.5">
                {section.body.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-sm leading-relaxed text-ink-700"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}

          <section>
            <h2 className="text-[15px] font-bold tracking-tight text-ink-900">
              {t("contactTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">
              {t("contactBody")}
            </p>
            <a
              href={`mailto:${t("contactEmail")}`}
              className="mt-1 inline-block text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              {t("contactEmail")}
            </a>
          </section>
        </div>

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-ink-200/70 pt-5 text-[13px]">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 font-semibold text-ink-500 transition-colors hover:text-ink-900"
          >
            <ArrowLeft className="size-3.5" />
            {t("backToLogin")}
          </Link>
          <Link
            href={`/${other}`}
            className="font-semibold text-brand-700 transition-colors hover:text-brand-800"
          >
            {t(`${other}Title`)}
          </Link>
        </footer>
      </main>
    </div>
  );
}
