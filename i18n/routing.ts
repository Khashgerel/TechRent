import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["mn", "en"],
  defaultLocale: "mn",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
