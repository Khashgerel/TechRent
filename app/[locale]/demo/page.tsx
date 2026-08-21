import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Building2, HardHat, Shield, Truck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { AuthLayout } from "@/components/auth/auth-card";
import { Avatar } from "@/components/ui/avatar";
import { db } from "@/lib/db";
import { demoLoginAction } from "@/lib/auth/login-actions";
import type { Role } from "@/lib/generated/prisma/enums";

const ROLE_ORDER: Role[] = ["OWNER", "OPERATOR", "COMPANY", "ADMIN"];

const ROLE_ICON = {
  OWNER: Truck,
  OPERATOR: HardHat,
  COMPANY: Building2,
  ADMIN: Shield,
} as const;

export default async function DemoPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("demo");
  const tRoles = await getTranslations("roles");
  const tAuth = await getTranslations("auth");

  // One representative account per role, oldest first so the seed order wins.
  const users = await db.user.findMany({
    where: { role: { in: ROLE_ORDER } },
    orderBy: { createdAt: "asc" },
    include: { companyProfile: true, operatorProfile: true, ownerProfile: true },
  });

  const personas = ROLE_ORDER.map((role) =>
    users.find((u) => u.role === role),
  ).filter((u) => u !== undefined);

  return (
    <AuthLayout>
      <div className="w-full max-w-2xl">
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
            {t("title")}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {personas.map((user) => {
            const Icon = ROLE_ICON[user.role];
            const subtitle =
              user.companyProfile?.companyName ??
              user.ownerProfile?.companyName ??
              (user.operatorProfile
                ? `${user.operatorProfile.aimag} · ${user.operatorProfile.yearsExperience} жил`
                : `+976 ${user.phone}`);

            return (
              <form
                key={user.id}
                action={demoLoginAction.bind(null, locale, user.id)}
              >
                <button
                  type="submit"
                  className="card group flex w-full items-center gap-3.5 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[var(--shadow-raised)]"
                >
                  <Avatar name={user.name} size="lg" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-600">
                      <Icon className="size-3.5" />
                      {tRoles(user.role)}
                    </span>
                    <span className="mt-0.5 block truncate text-[15px] font-bold text-ink-900">
                      {user.name}
                    </span>
                    <span className="block truncate text-[12px] text-ink-500">
                      {subtitle}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" />
                </button>
              </form>
            );
          })}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-[13px] font-bold text-ink-500 hover:text-ink-800"
          >
            {t("orLogin")} →
          </Link>
        </div>

        <p className="mt-2 text-center text-[12px] text-ink-400">
          {tAuth("loginSubtitle")}
        </p>
      </div>
    </AuthLayout>
  );
}
