"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/feedback";

/**
 * Catches anything a dashboard screen throws — most often a database
 * connection that went away mid-render. `reset()` re-renders the segment,
 * which is usually all it takes once the connection is back, so the visitor
 * gets a retry rather than a dead end.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <PageHeader title={t("title")} />

      <EmptyState
        icon={<AlertTriangle className="size-8" />}
        title={t("body")}
        description={error.digest ? t("reference", { id: error.digest }) : undefined}
        action={
          <Button variant="outline" onClick={reset}>
            <RotateCcw />
            {t("retry")}
          </Button>
        }
      />
    </>
  );
}
