import { notFound } from "next/navigation";

/**
 * Anything under a locale that matches no real route. Next's built-in 404 would
 * otherwise answer in English with no shell; calling `notFound()` from inside
 * the `[locale]` segment hands the request to `app/[locale]/not-found.tsx`,
 * which speaks the visitor's language.
 */
export default function CatchAllPage(): never {
  notFound();
}
