import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

/** Route prefixes reachable without a session. Everything else needs one. */
// `/staff-login` is public in the sense that it needs no session — it is
// linked from nowhere and protected by the password itself.
const PUBLIC_PATHS = ["/", "/login", "/verify", "/demo", "/store", "/staff-login"];

const SESSION_COOKIE = "techrent_session";

function stripLocale(pathname: string) {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1);
    }
  }
  return pathname;
}

export function proxy(request: NextRequest) {
  const response = intlMiddleware(request);

  // Let next-intl finish any locale redirect before we consider auth.
  if (response.status >= 300 && response.status < 400) return response;

  const path = stripLocale(request.nextUrl.pathname);
  const isPublic = PUBLIC_PATHS.some(
    (p) => path === p || (p !== "/" && path.startsWith(`${p}/`)),
  );
  if (isPublic) return response;

  // An optimistic check only — presence of the cookie, not its validity. The
  // real verification happens in server components and actions, which is the
  // boundary that actually protects data.
  if (!request.cookies.has(SESSION_COOKIE)) {
    const locale = request.nextUrl.pathname.split("/")[1] || routing.defaultLocale;
    const url = new URL(`/${locale}/login`, request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\..*).*)"],
};
