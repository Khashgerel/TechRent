import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { Alert } from "@/components/ui/feedback";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireRole } from "@/lib/auth/guards";
import { getAuditLog, getPlatformSettings } from "@/lib/admin/queries";
import { auditMessageKey } from "@/lib/admin/audit";
import { formatDate } from "@/lib/dates";

export default async function AdminSettingsPage({
  params,
}: PageProps<"/[locale]/admin/settings">) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requireRole(locale, "ADMIN");
  const t = await getTranslations("admin.settings");
  const tt = await getTranslations();

  const [settings, audit] = await Promise.all([
    getPlatformSettings(),
    getAuditLog(12),
  ]);

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />

      <Alert tone="brand" className="mb-4">
        {t("liveNotice")}
      </Alert>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SettingsForm settings={settings} />
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("auditTitle")}</CardTitle>
            </CardHeader>

            {audit.length ? (
              <div className="divide-y divide-ink-200/70">
                {audit.map((entry) => {
                  const key = auditMessageKey(entry.action);

                  return (
                  <div key={entry.id} className="px-5 py-3">
                    <p className="text-[13px] font-bold text-ink-900">
                      {tt.has(key) ? tt(key) : entry.action}
                    </p>
                    <p className="text-[12px] text-ink-500">
                      {entry.actor?.name ?? "—"} ·{" "}
                      {formatDate(entry.createdAt, locale)}
                    </p>
                  </div>
                  );
                })}
              </div>
            ) : (
              <CardBody>
                <p className="text-[13px] text-ink-500">{t("auditEmpty")}</p>
              </CardBody>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
