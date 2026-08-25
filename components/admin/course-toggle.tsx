"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { setCoursePublishedAction } from "@/app/[locale]/(dashboard)/admin/actions";

/** Publishing is the one Academy control that changes what operators can see. */
export function CourseToggle({
  courseId,
  published,
}: {
  courseId: string;
  published: boolean;
}) {
  const t = useTranslations("admin.academy");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant={published ? "ghost" : "subtle"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setCoursePublishedAction(locale, courseId, !published);
          router.refresh();
        })
      }
    >
      {pending ? (
        <Loader2 className="animate-spin" />
      ) : published ? (
        <EyeOff />
      ) : (
        <Eye />
      )}
      {published ? t("unpublish") : t("publish")}
    </Button>
  );
}
