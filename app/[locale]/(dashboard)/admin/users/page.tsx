import { getTranslations, setRequestLocale } from "next-intl/server";
import { Ban, Users } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { UserActions } from "@/components/admin/user-actions";
import { UserFilters } from "@/components/admin/user-filters";
import { requireRole } from "@/lib/auth/guards";
import { listAdminUsers, type UserFilters as Filters } from "@/lib/admin/queries";
import { formatDate } from "@/lib/dates";
import { formatMNT } from "@/lib/money";
import type { Role, VerificationStatus } from "@/lib/generated/prisma/enums";

const ROLES: Role[] = ["OWNER", "OPERATOR", "COMPANY", "ADMIN"];
const STATUSES: VerificationStatus[] = [
  "UNVERIFIED",
  "PENDING",
  "VERIFIED",
  "REJECTED",
];

const STATUS_TONE: Record<
  VerificationStatus,
  "brand" | "positive" | "caution" | "critical"
> = {
  UNVERIFIED: "caution",
  PENDING: "caution",
  VERIFIED: "positive",
  REJECTED: "critical",
};

export default async function AdminUsersPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/users">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireRole(locale, "ADMIN");
  const t = await getTranslations();

  const sp = await searchParams;
  const one = (key: string) => {
    const value = sp[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const filters: Filters = {
    query: one("q") || undefined,
    role: ROLES.find((r) => r === one("role")),
    verification: STATUSES.find((s) => s === one("verification")),
    suspendedOnly: one("suspended") === "1",
  };

  const users = await listAdminUsers(filters);
  const pending = users.filter((user) => user.verification === "PENDING").length;

  return (
    <>
      <PageHeader
        title={t("admin.users.title")}
        description={t("admin.users.subtitle")}
        actions={
          pending ? (
            <Badge tone="caution">{t("admin.users.pendingCount", { count: pending })}</Badge>
          ) : null
        }
      />

      <UserFilters />

      {users.length === 0 ? (
        <EmptyState
          icon={<Users className="size-8" />}
          title={t("admin.users.none")}
          description={t("admin.users.noneHint")}
        />
      ) : (
        <Card>
          <div className="divide-y divide-ink-200/70">
            {users.map((user) => {
              const profileName =
                user.companyProfile?.companyName ??
                user.ownerProfile?.companyName ??
                null;
              const place =
                user.companyProfile?.aimag ??
                user.ownerProfile?.aimag ??
                user.operatorProfile?.aimag ??
                null;

              return (
                <div
                  key={user.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                >
                  <Avatar name={user.name} className="shrink-0" />

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-[14px] font-bold text-ink-900">
                      {user.name}
                      {user.suspendedAt ? (
                        <Ban className="size-3.5 shrink-0 text-critical" />
                      ) : null}
                    </p>
                    <p className="truncate text-[12px] text-ink-500">
                      {user.phone}
                      {profileName ? ` · ${profileName}` : ""}
                      {place ? ` · ${place}` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      {user.roles.map((role) => (
                        <Badge key={role} tone="neutral">
                          {t(`roles.${role}`)}
                        </Badge>
                      ))}
                      <Badge tone={STATUS_TONE[user.verification]}>
                        {t(`admin.users.status.${user.verification}`)}
                      </Badge>
                    </div>
                    <p className="text-[12px] text-ink-400 tabular">
                      {formatMNT(user.balance, locale)} ·{" "}
                      {formatDate(user.createdAt, locale)}
                    </p>
                  </div>

                  <div className="w-full sm:w-auto">
                    <UserActions
                      userId={user.id}
                      verification={user.verification}
                      suspended={Boolean(user.suspendedAt)}
                      isSelf={user.id === session.uid}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {users.length === 100 ? (
            <CardBody className="border-t border-ink-200/70">
              <p className="text-[12px] text-ink-500">{t("admin.users.capped")}</p>
            </CardBody>
          ) : null}
        </Card>
      )}
    </>
  );
}
