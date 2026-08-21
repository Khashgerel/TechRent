import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { routing } from "@/i18n/routing";

/**
 * Clears the session cookie and bounces to login. Server components can't write
 * cookies, so guards that discover a stale session redirect here instead.
 */
export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale");
  const target = routing.locales.includes(locale as never)
    ? locale
    : routing.defaultLocale;

  const response = NextResponse.redirect(new URL(`/${target}/login`, request.url));
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
