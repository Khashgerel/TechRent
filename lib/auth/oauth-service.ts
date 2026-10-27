import "server-only";

import { db } from "@/lib/db";
import type { OAuthProvider, Role } from "@/lib/generated/prisma/enums";
import type { OAuthProfile } from "./oauth";

/**
 * What a self-registered account starts as.
 *
 * Signing in asks for nothing beyond the provider's answer, so the account
 * begins as a client — the role that can search and place orders, which is
 * what a new visitor is almost always here to do. Owning machines or operating
 * them is added later from the profile page, and the company details are asked
 * for at the moment they are first needed rather than at sign-up.
 */
const NEW_ACCOUNT_ROLES: Role[] = ["COMPANY"];
const NEW_ACCOUNT_ACTIVE_ROLE: Role = "COMPANY";

export class AccountSuspendedError extends Error {
  constructor() {
    super("This account has been suspended");
    this.name = "AccountSuspendedError";
  }
}

/** A readable name when the provider gives none. */
function fallbackName(profile: OAuthProfile) {
  const local = profile.email?.split("@")[0];
  if (local && local.length > 0) return local;
  return "TechRent хэрэглэгч";
}

/**
 * Signs a visitor in from a provider profile, creating the account if this is
 * the first time.
 *
 * Three cases, in order: the social identity is already linked; it is not, but
 * an account holds the same email, so the identity is linked to it; or neither,
 * so a new account is opened. The middle case is what stops one person ending
 * up with a Google account and a separate Facebook account.
 */
export async function signInWithOAuth(
  provider: OAuthProvider,
  profile: OAuthProfile,
) {
  const linked = await db.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId: profile.providerAccountId,
      },
    },
    include: { user: true },
  });

  if (linked) {
    if (linked.user.suspendedAt) throw new AccountSuspendedError();
    return linked.user;
  }

  if (profile.email) {
    const byEmail = await db.user.findUnique({
      where: { email: profile.email },
    });

    if (byEmail) {
      if (byEmail.suspendedAt) throw new AccountSuspendedError();

      await db.oAuthAccount.create({
        data: {
          userId: byEmail.id,
          provider,
          providerAccountId: profile.providerAccountId,
          email: profile.email,
        },
      });

      // Fill in only what the account is missing; never overwrite a name or
      // picture the person has already set here.
      if (!byEmail.avatarUrl && profile.avatarUrl) {
        return db.user.update({
          where: { id: byEmail.id },
          data: { avatarUrl: profile.avatarUrl },
        });
      }
      return byEmail;
    }
  }

  const name = profile.name ?? fallbackName(profile);

  // The wallet is created with the account because the ledger assumes every
  // user has one — a checkout or a booking would otherwise fail on first use.
  return db.user.create({
    data: {
      name,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
      roles: NEW_ACCOUNT_ROLES,
      activeRole: NEW_ACCOUNT_ACTIVE_ROLE,
      wallet: { create: { kind: "USER_WALLET", label: name } },
      oauthAccounts: {
        create: {
          provider,
          providerAccountId: profile.providerAccountId,
          email: profile.email,
        },
      },
    },
  });
}
