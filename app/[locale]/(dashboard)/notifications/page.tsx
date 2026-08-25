import { getTranslations, setRequestLocale } from "next-intl/server";
import { Bell } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { MarkAllReadButton } from "@/components/shell/mark-all-read";
import { requireSession } from "@/lib/auth/guards";
import { getNotifications } from "@/lib/bookings/queries";
import { formatDate } from "@/lib/dates";
import { formatMNT } from "@/lib/money";
import { cn } from "@/lib/utils";

type Payload = {
  orderTitle?: string;
  companyName?: string;
  equipmentName?: string;
  amount?: number;
  count?: number;
  rating?: number;
};

export default async function NotificationsPage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireSession(locale);
  const t = await getTranslations();
  const notifications = await getNotifications(session.uid);

  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <>
      <PageHeader
        title={t("notifications.title")}
        description={unread ? `${unread} ${t("notifications.unread")}` : undefined}
        actions={unread ? <MarkAllReadButton /> : undefined}
      />

      {notifications.length === 0 ? (
        <EmptyState icon={<Bell className="size-8" />} title={t("notifications.empty")} />
      ) : (
        <Card>
          {notifications.map((notification) => {
            const data = (notification.data ?? {}) as Payload;

            // Notifications are stored as a type plus a payload, so the wording
            // is chosen here at render time rather than frozen at write time.
            const detail = [
              data.orderTitle,
              data.equipmentName,
              data.companyName,
              typeof data.amount === "number"
                ? formatMNT(data.amount, locale)
                : undefined,
            ]
              .filter(Boolean)
              .join(" · ");

            const body = (
              <div
                className={cn(
                  "flex items-start gap-3 border-b border-ink-200/70 px-4 py-3 last:border-0",
                  !notification.readAt && "bg-brand-50/50",
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    notification.readAt ? "bg-transparent" : "bg-brand-600",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-ink-900">
                    {t(`notificationTypes.${notification.type}`)}
                  </p>
                  {detail ? (
                    <p className="truncate text-[13px] text-ink-600">{detail}</p>
                  ) : null}
                  <p className="mt-0.5 text-[12px] text-ink-400">
                    {formatDate(notification.createdAt, locale)}
                  </p>
                </div>
              </div>
            );

            return notification.link ? (
              <Link
                key={notification.id}
                href={notification.link}
                className="block transition-colors hover:bg-ink-50/70"
              >
                {body}
              </Link>
            ) : (
              <div key={notification.id}>{body}</div>
            );
          })}
        </Card>
      )}
    </>
  );
}
