import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthLayout } from "@/components/auth/auth-card";
import { db } from "@/lib/db";
import { demoGateEnabled } from "@/lib/auth/demo-gate";
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

  // One representative account per role, oldest first so the seed order wins.
  const users = await db.user.findMany({
    where: { role: { in: ROLE_ORDER } },
    orderBy: { createdAt: "asc" },
    include: { companyProfile: true, operatorProfile: true, ownerProfile: true },
  });

  const personas: Persona[] = ROLE_ORDER.map((role) =>
    users.find((u) => u.role === role),
  )
    .filter((u) => u !== undefined)
    .map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      subtitle:
        user.companyProfile?.companyName ??
        user.ownerProfile?.companyName ??
        (user.operatorProfile
          ? `${user.operatorProfile.aimag} · ${user.operatorProfile.yearsExperience} жил`
          : `+976 ${user.phone}`),
    }));

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
      </div>
    </AuthLayout>
  );
}
