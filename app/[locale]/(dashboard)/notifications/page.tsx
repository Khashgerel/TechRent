import { setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/feedback";
import { requireSession } from "@/lib/auth/guards";

export default async function Page({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSession(locale);

  return (
    <>
      <PageHeader title="Notifications" />
      <EmptyState title="Coming in the next phase" />
    </>
  );
}
