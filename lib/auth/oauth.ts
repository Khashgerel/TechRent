import type { OAuthProvider } from "@/lib/generated/prisma/enums";

/**
 * Google and Facebook sign-in, hand-rolled.
 *
 * The authorization-code flow is three requests — send the visitor to the
 * provider, swap the returned code for a token, ask who they are — and this is
 * all of it. Auth.js would bring its own session and adapter conventions, and
 * TechRent already has a signed cookie it trusts (`./session`), so the smaller
 * piece is the flow rather than the framework.
 *
 * No provider token is stored. The provider is asked who the visitor is once,
 * at sign-in, and nothing is ever called on their behalf afterwards.
 *
 * Free of `server-only` and of any database import so the pure parts — which
 * provider is configured, and how a provider's answer becomes a profile — can
 * be tested directly.
 */

export type ProviderConfig = {
  id: OAuthProvider;
  /** The `provider` path segment, e.g. /api/auth/google/callback. */
  slug: string;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
};

export const PROVIDERS: Record<OAuthProvider, ProviderConfig> = {
  GOOGLE: {
    id: "GOOGLE",
    slug: "google",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
    scope: "openid email profile",
  },
  FACEBOOK: {
    id: "FACEBOOK",
    slug: "facebook",
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    // Facebook returns no email when the account has none verified, or when
    // the visitor declines the permission — `normalizeProfile` allows for it.
    userInfoUrl: "https://graph.facebook.com/me?fields=id,name,email,picture",
    scope: "email public_profile",
  },
};

export function providerFromSlug(slug: string): ProviderConfig | null {
  const match = Object.values(PROVIDERS).find((p) => p.slug === slug);
  return match ?? null;
}

function credentialsFor(provider: OAuthProvider) {
  const prefix = provider === "GOOGLE" ? "GOOGLE" : "FACEBOOK";
  return {
    clientId: process.env[`${prefix}_CLIENT_ID`],
    clientSecret: process.env[`${prefix}_CLIENT_SECRET`],
  };
}

/**
 * Whether this provider has been given credentials.
 *
 * Sign-in buttons are only rendered for providers that answer true, so the
 * feature ships dormant and turns itself on when the secrets are added —
 * the same shape as `qpayConfigured` and `demoGateEnabled`.
 */
export function providerConfigured(provider: OAuthProvider) {
  const { clientId, clientSecret } = credentialsFor(provider);
  return Boolean(clientId && clientSecret);
}

export function configuredProviders(): ProviderConfig[] {
  return Object.values(PROVIDERS).filter((p) => providerConfigured(p.id));
}

export function oauthEnabled() {
  return configuredProviders().length > 0;
}

export class OAuthConfigError extends Error {
  constructor(provider: OAuthProvider) {
    super(`${provider} sign-in is not configured`);
    this.name = "OAuthConfigError";
  }
}

export function redirectUriFor(baseUrl: string, provider: ProviderConfig) {
  return `${baseUrl.replace(/\/$/, "")}/api/auth/${provider.slug}/callback`;
}

/** The provider page to send the visitor to. */
export function authorizeUrlFor(
  provider: ProviderConfig,
  baseUrl: string,
  state: string,
) {
  const { clientId } = credentialsFor(provider.id);
  if (!clientId) throw new OAuthConfigError(provider.id);

  const url = new URL(provider.authorizeUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUriFor(baseUrl, provider));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", provider.scope);
  url.searchParams.set("state", state);
  return url.toString();
}

export type OAuthProfile = {
  providerAccountId: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

/**
 * Turns a provider's answer into the few fields an account needs.
 *
 * Google and Facebook disagree on nearly every key — `sub` against `id`,
 * a picture string against a nested data object — so the differences are
 * flattened here rather than at the call site. Pure, and tested.
 */
export function normalizeProfile(
  provider: OAuthProvider,
  raw: Record<string, unknown>,
): OAuthProfile | null {
  const id = provider === "GOOGLE" ? raw.sub : raw.id;
  if (typeof id !== "string" || id.length === 0) return null;

  const email = typeof raw.email === "string" ? raw.email.toLowerCase() : null;
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name : null;

  let avatarUrl: string | null = null;
  if (provider === "GOOGLE") {
    avatarUrl = typeof raw.picture === "string" ? raw.picture : null;
  } else {
    const picture = raw.picture as
      | { data?: { url?: unknown; is_silhouette?: unknown } }
      | undefined;
    const url = picture?.data?.url;
    // Facebook hands out a generic silhouette rather than nothing at all.
    avatarUrl =
      typeof url === "string" && picture?.data?.is_silhouette !== true
        ? url
        : null;
  }

  return { providerAccountId: id, name, email, avatarUrl };
}

/** Swaps the authorization code for an access token. */
export async function exchangeCode(
  provider: ProviderConfig,
  code: string,
  baseUrl: string,
): Promise<string> {
  const { clientId, clientSecret } = credentialsFor(provider.id);
  if (!clientId || !clientSecret) throw new OAuthConfigError(provider.id);

  const response = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUriFor(baseUrl, provider),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `${provider.id} token exchange failed (${response.status})`,
    );
  }

  const body = (await response.json()) as { access_token?: unknown };
  if (typeof body.access_token !== "string") {
    throw new Error(`${provider.id} returned no access token`);
  }
  return body.access_token;
}

/** Asks the provider who the visitor is. */
export async function fetchProfile(
  provider: ProviderConfig,
  accessToken: string,
): Promise<OAuthProfile | null> {
  const response = await fetch(provider.userInfoUrl, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const raw = (await response.json()) as Record<string, unknown>;
  return normalizeProfile(provider.id, raw);
}
