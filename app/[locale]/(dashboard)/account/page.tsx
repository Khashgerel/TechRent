import { getTranslations, setRequestLocale } from "next-intl/server";
import { BadgeCheck, Building2, HardHat, Truck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const OFFERS = [
  { role: "OWNER", href: "/account/become-owner", icon: Truck },
  { role: "OPERATOR", href: "/account/become-operator", icon: HardHat },
  { role: "COMPANY", href: "/company/profile", icon: Building2 },
] as const;

/**
 * What this account is, and what it could also be.
 *
 * Signing in asks for nothing, so every account starts as a client and picks
 * up the other roles here — one form each, at the moment the person wants the
 * role rather than at sign-up.
 */
export default async function AccountPage({
  params,
  searchParams,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireSession(locale);
  const t = await getTranslations("account");
  const tRoles = await getTranslations("roles");

  // Set when a guard sent someone here because they opened an area they do not
  // hold yet, so the offer they wanted is the one highlighted.
  const sp = await searchParams;
  const wanted = typeof sp.want === "string" ? sp.want : null;

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.uid },
    select: { name: true, email: true, verification: true, roles: true },
  });

  const available = OFFERS.filter((offer) => !user.roles.includes(offer.role));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <Card className="mb-6">
        <CardBody className="flex flex-col gap-4">
          <div>
            <p className="text-[15px] font-bold text-ink-900">{user.name}</p>
            {user.email ? (
              <p className="text-[13px] text-ink-500">{user.email}</p>
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-400">
              {t("yourRoles")}
            </p>
            <div className="flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <Badge key={role} tone="brand">
                  {tRoles(role)}
                </Badge>
              ))}
              {user.verification === "VERIFIED" ? (
                <Badge tone="positive">
                  <BadgeCheck className="size-3.5" />
                  {t("verified")}
                </Badge>
              ) : (
                <Badge tone="caution">{t("unverified")}</Badge>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {available.length > 0 ? (
        <>
          <h2 className="mb-3 text-[15px] font-bold text-ink-900">
            {t("addRole")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {available.map((offer) => {
              const Icon = offer.icon;
              const highlighted = wanted === offer.role;
              return (
                <Card
                  key={offer.role}
                  className={highlighted ? "border-brand-500" : undefined}
                >
                  <CardBody className="flex flex-col gap-3">
                    <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-brand-600">
                      <Icon className="size-4" />
                      {tRoles(offer.role)}
                    </span>
                    <p className="text-[13px] text-ink-500">
                      {t(`offers.${offer.role}`)}
                    </p>
                    <Link
                      href={offer.href}
                      className={buttonVariants({ size: "sm", variant: "subtle" })}
                    >
                      {t(`become.${offer.role}`)}
                    </Link>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <p className="text-[13px] text-ink-500">{t("allRoles")}</p>
      )}
    </div>
  );
}
