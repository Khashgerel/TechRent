import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSession, sessionFor } from "@/lib/auth/session";
import { homeForRole } from "@/lib/auth/guards";
import {
  exchangeCode,
  fetchProfile,
  providerConfigured,
  providerFromSlug,
} from "@/lib/auth/oauth";
import {
  AccountSuspendedError,
  signInWithOAuth,
} from "@/lib/auth/oauth-service";
import { OAUTH_STATE_COOKIE, publicBaseUrl } from "../route";

export const dynamic = "force-dynamic";

function sameState(a: string, b: string) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Finishes the sign-in: checks the state, swaps the code for a token, asks the
 * provider who this is, then opens or reuses the matching account.
 *
 * Every failure lands back on the sign-in page with a reason rather than an
 * error page, because the visitor can do something about most of them.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: slug } = await params;
  const provider = providerFromSlug(slug);
  const url = new URL(request.url);
  const store = await cookies();

  const stateCookie = store.get(OAUTH_STATE_COOKIE)?.value ?? "";
  const locale = stateCookie.split(".")[1] === "en" ? "en" : "mn";
  const base = await publicBaseUrl();
  const back = (reason: string) =>
    NextResponse.redirect(`${base}/${locale}/login?error=${reason}`);

  // The state cookie is single use whatever happens next.
  store.delete(OAUTH_STATE_COOKIE);

  if (!provider || !providerConfigured(provider.id)) {
    return NextResponse.json({ error: "unknown_provider" }, { status: 404 });
  }

  // The visitor declined, or the provider refused.
  if (url.searchParams.get("error")) return back("oauthDenied");

  const state = url.searchParams.get("state") ?? "";
  if (!stateCookie || !state || !sameState(stateCookie, state)) {
    return back("oauthState");
  }

  const code = url.searchParams.get("code");
  if (!code) return back("oauthDenied");

  try {
    const accessToken = await exchangeCode(provider, code, base);
    const profile = await fetchProfile(provider, accessToken);
    if (!profile) return back("oauthProfile");

    const user = await signInWithOAuth(provider.id, profile);
    await createSession(sessionFor(user));

    return NextResponse.redirect(
      `${base}/${locale}/${homeForRole(user.activeRole)}`,
    );
  } catch (error) {
    if (error instanceof AccountSuspendedError) return back("suspended");
    console.error("OAuth callback failed", error);
    return back("oauthFailed");
  }
}
