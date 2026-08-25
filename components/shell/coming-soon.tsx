import { useTranslations } from "next-intl";
import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/feedback";

/**
 * Placeholder for navigation entries whose module lands in a later phase, so a
 * sidebar link never dead-ends in a 404 during a walkthrough.
 */
export function ComingSoon({ title }: { title: string }) {
  const t = useTranslations("common");

  return (
    <>
      <PageHeader title={title} />
      <EmptyState
        icon={<Hammer className="size-8" />}
        title={t("comingSoonTitle")}
        description={t("comingSoonBody")}
      />
    </>
  );
}
