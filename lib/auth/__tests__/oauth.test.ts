import { afterEach, describe, expect, it } from "vitest";
import {
  authorizeUrlFor,
  configuredProviders,
  normalizeProfile,
  oauthEnabled,
  PROVIDERS,
  providerConfigured,
  providerFromSlug,
  redirectUriFor,
} from "../oauth";

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
});

function configureGoogle() {
  process.env.GOOGLE_CLIENT_ID = "google-client";
  process.env.GOOGLE_CLIENT_SECRET = "google-secret";
}

describe("providerConfigured", () => {
  it("is off until both halves of the credential are present", () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    expect(providerConfigured("GOOGLE")).toBe(false);

    process.env.GOOGLE_CLIENT_ID = "google-client";
    expect(providerConfigured("GOOGLE")).toBe(false);

    process.env.GOOGLE_CLIENT_SECRET = "google-secret";
    expect(providerConfigured("GOOGLE")).toBe(true);
  });

  it("reports no providers, and social sign-in off, when nothing is set", () => {
    for (const key of [
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "FACEBOOK_CLIENT_ID",
      "FACEBOOK_CLIENT_SECRET",
    ]) {
      delete process.env[key];
    }
    expect(configuredProviders()).toEqual([]);
    expect(oauthEnabled()).toBe(false);
  });

  it("offers only the providers that are configured", () => {
    delete process.env.FACEBOOK_CLIENT_ID;
    delete process.env.FACEBOOK_CLIENT_SECRET;
    configureGoogle();

    expect(configuredProviders().map((p) => p.id)).toEqual(["GOOGLE"]);
    expect(oauthEnabled()).toBe(true);
  });
});

describe("providerFromSlug", () => {
  it("resolves the slugs used in the callback path", () => {
    expect(providerFromSlug("google")?.id).toBe("GOOGLE");
    expect(providerFromSlug("facebook")?.id).toBe("FACEBOOK");
  });

  it("refuses anything else", () => {
    expect(providerFromSlug("twitter")).toBeNull();
    expect(providerFromSlug("")).toBeNull();
  });
});

describe("redirectUriFor", () => {
  it("builds the callback the provider must have registered", () => {
    expect(redirectUriFor("https://example.com", PROVIDERS.GOOGLE)).toBe(
      "https://example.com/api/auth/google/callback",
    );
  });

  it("tolerates a trailing slash on the base URL", () => {
    expect(redirectUriFor("https://example.com/", PROVIDERS.FACEBOOK)).toBe(
      "https://example.com/api/auth/facebook/callback",
    );
  });
});

describe("authorizeUrlFor", () => {
  it("carries the client, redirect, scope and state", () => {
    configureGoogle();
    const url = new URL(
      authorizeUrlFor(PROVIDERS.GOOGLE, "https://example.com", "nonce.mn"),
    );

    expect(url.origin + url.pathname).toBe(PROVIDERS.GOOGLE.authorizeUrl);
    expect(url.searchParams.get("client_id")).toBe("google-client");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://example.com/api/auth/google/callback",
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("nonce.mn");
    expect(url.searchParams.get("scope")).toContain("email");
  });

  it("refuses to build a URL for an unconfigured provider", () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    expect(() =>
      authorizeUrlFor(PROVIDERS.GOOGLE, "https://example.com", "s"),
    ).toThrow(/not configured/);
  });

  it("never leaks the client secret into the URL", () => {
    configureGoogle();
    const url = authorizeUrlFor(PROVIDERS.GOOGLE, "https://example.com", "s");
    expect(url).not.toContain("google-secret");
  });
});

describe("normalizeProfile", () => {
  it("reads Google's shape", () => {
    expect(
      normalizeProfile("GOOGLE", {
        sub: "116",
        name: "Болд Доржийн",
        email: "Bold@Example.COM",
        picture: "https://img/a.jpg",
      }),
    ).toEqual({
      providerAccountId: "116",
      name: "Болд Доржийн",
      email: "bold@example.com",
      avatarUrl: "https://img/a.jpg",
    });
  });

  it("reads Facebook's nested picture", () => {
    expect(
      normalizeProfile("FACEBOOK", {
        id: "99",
        name: "Болд",
        email: "b@example.com",
        picture: { data: { url: "https://img/b.jpg", is_silhouette: false } },
      })?.avatarUrl,
    ).toBe("https://img/b.jpg");
  });

  it("treats Facebook's silhouette as no picture at all", () => {
    expect(
      normalizeProfile("FACEBOOK", {
        id: "99",
        name: "Болд",
        picture: { data: { url: "https://img/default.jpg", is_silhouette: true } },
      })?.avatarUrl,
    ).toBeNull();
  });

  it("accepts a profile with no email, which Facebook may well return", () => {
    const profile = normalizeProfile("FACEBOOK", { id: "99", name: "Болд" });
    expect(profile).not.toBeNull();
    expect(profile?.email).toBeNull();
  });

  it("rejects an answer with no account id", () => {
    expect(normalizeProfile("GOOGLE", { name: "Болд" })).toBeNull();
    expect(normalizeProfile("GOOGLE", { sub: "" })).toBeNull();
    expect(normalizeProfile("FACEBOOK", { id: 99 })).toBeNull();
  });

  it("treats a blank name as absent so a fallback can be chosen", () => {
    expect(normalizeProfile("GOOGLE", { sub: "1", name: "   " })?.name).toBeNull();
  });
});
