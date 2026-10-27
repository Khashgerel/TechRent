import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthLayout } from "@/components/auth/auth-card";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { db } from "@/lib/db";
import { demoGateEnabled } from "@/lib/auth/demo-gate";
import { oauthEnabled } from "@/lib/auth/oauth";
import type { Role } from "@/lib/generated/prisma/enums";
import { DemoPicker, type Persona } from "./demo-picker";

const ROLE_ORDER: Role[] = ["OWNER", "OPERATOR", "COMPANY", "ADMIN"];

// The personas come from the database, so this page must not be prerendered —
// a build shouldn't need a reachable database to produce a page of live rows.
export const dynamic = "force-dynamic";

export default async function DemoPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("demo");
  const tAuth = await getTranslations("auth");

  // One representative account per role, oldest first so the seed order wins.
  const users = await db.user.findMany({
    where: { roles: { hasSome: ROLE_ORDER } },
    orderBy: { createdAt: "asc" },
    include: { companyProfile: true, operatorProfile: true, ownerProfile: true },
  });

  // One representative account per role. Built in a single pass so each card
  // keeps the role it was chosen for — an account may hold several, and the
  // card should say which one it is standing in for.
  // Now that an account can hold several roles, the same person would
  // otherwise fill three cards. Hand out distinct people where there are
  // enough to go round, and fall back to reusing one where there aren't.
  const taken = new Set<string>();

  const personas: Persona[] = ROLE_ORDER.flatMap((role) => {
    const holders = users.filter((u) => u.roles.includes(role));
    const user = holders.find((u) => !taken.has(u.id)) ?? holders[0];
    if (!user) return [];
    taken.add(user.id);

    return [
      {
        id: user.id,
        name: user.name,
        role,
        subtitle:
          user.companyProfile?.companyName ??
          user.ownerProfile?.companyName ??
          (user.operatorProfile
            ? `${user.operatorProfile.aimag} · ${user.operatorProfile.yearsExperience} жил`
            : user.phone
              ? `+976 ${user.phone}`
              : (user.email ?? "")),
      },
    ];
  });

  const gated = demoGateEnabled();

  return (
    <AuthLayout>
      <div className="w-full max-w-2xl">
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
            {t("title")}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
            {gated ? t("gatedSubtitle") : t("subtitle")}
          </p>
        </div>

        <DemoPicker personas={personas} locale={locale} gated={gated} />

        {oauthEnabled() ? (
          <div className="mt-8">
            {/* Open to anyone: the password guards the seeded personas, not
                people signing up with an account of their own. */}
            <OAuthButtons locale={locale} label={tAuth("orContinueWith")} />
          </div>
        ) : null}
      </div>
    </AuthLayout>
  );
}
