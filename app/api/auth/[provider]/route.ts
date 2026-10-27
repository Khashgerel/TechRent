import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { authorizeUrlFor, providerConfigured, providerFromSlug } from "@/lib/auth/oauth";

export const dynamic = "force-dynamic";

export const OAUTH_STATE_COOKIE = "techrent_oauth_state";

/** Where the provider should send the visitor back to. */
export async function publicBaseUrl() {
  const configured = process.env.OAUTH_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  const host = (await headers()).get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

/**
 * Starts the sign-in: parks a random value in a cookie and sends the visitor
 * to the provider carrying the same value as `state`. The callback refuses
 * anything whose state doesn't match, which is what stops a stranger's
 * callback URL signing somebody in.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: slug } = await params;
  const provider = providerFromSlug(slug);

  if (!provider || !providerConfigured(provider.id)) {
    return NextResponse.json({ error: "unknown_provider" }, { status: 404 });
  }

  const locale = new URL(request.url).searchParams.get("locale") ?? "mn";
  const nonce = randomBytes(16).toString("hex");
  // The locale rides along so the callback knows where to land the visitor.
  const state = `${nonce}.${locale === "en" ? "en" : "mn"}`;

  const store = await cookies();
  store.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  const base = await publicBaseUrl();
  return NextResponse.redirect(authorizeUrlFor(provider, base, state));
}
