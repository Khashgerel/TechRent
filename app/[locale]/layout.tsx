import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import "../globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ТекРент — Техник. Оператор. Компани.",
    template: "%s · ТекРент",
  },
  description:
    "Барилгын тоног төхөөрөмжийн эзэмшигчид, операторууд, компаниудыг нэгтгэсэн дижитал зах зээл.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  return (
    // Browser extensions write their own attributes onto <html> before React
    // hydrates, which React reports as a mismatch it "won't patch up". The
    // suppression covers this element's own attributes only, and the two we set
    // are derived from the locale param, so nothing real is being hidden.
    <html lang={locale} className={manrope.variable} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
