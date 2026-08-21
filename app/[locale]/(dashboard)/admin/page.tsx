import { setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/feedback";
import { requireRole } from "@/lib/auth/guards";

export default async function Page({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, "ADMIN");

  return (
    <>
      <PageHeader title={session.name} description="admin" />
      <EmptyState title="Coming in the next phase" />
    </>
  );
}
