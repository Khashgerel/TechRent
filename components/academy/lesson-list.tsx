"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronDown, Clock } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { completeLessonAction } from "@/lib/academy/actions";
import { cn } from "@/lib/utils";

export type LessonData = {
  id: string;
  order: number;
  title: string;
  content: string;
  durationMin: number;
  read: boolean;
};

/**
 * Lessons open one at a time. Marking one read is what unlocks the quiz, so the
 * button is the step that carries progress rather than a decorative checkbox.
 */
export function LessonList({
  courseId,
  lessons,
}: {
  courseId: string;
  lessons: LessonData[];
}) {
  const t = useTranslations("academy");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const firstUnread = lessons.find((l) => !l.read)?.id ?? lessons[0]?.id;
  const [openId, setOpenId] = useState<string | undefined>(firstUnread);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("lesson")}</CardTitle>
        <span className="text-[12px] font-semibold text-ink-500">
          {lessons.filter((l) => l.read).length} / {lessons.length}
        </span>
      </CardHeader>

      <div className="divide-y divide-ink-200/70">
        {lessons.map((lesson) => {
          const open = openId === lesson.id;

          return (
            <div key={lesson.id}>
              <button
                type="button"
                onClick={() => setOpenId(open ? undefined : lesson.id)}
                className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-ink-50/70"
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                    lesson.read
                      ? "bg-positive text-white"
                      : "bg-ink-100 text-ink-500",
                  )}
                >
                  {lesson.read ? <Check className="size-3.5" /> : lesson.order}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold text-ink-900">
                    {lesson.title}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[12px] text-ink-400">
                    <Clock className="size-3" />
                    {t("duration", { minutes: lesson.durationMin })}
                  </span>
                </span>

                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-ink-400 transition-transform",
                    open && "rotate-180",
                  )}
                />
              </button>

              {open ? (
                <CardBody className="border-t border-ink-200/70 bg-surface-muted">
                  <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-700">
                    {lesson.content}
                  </p>

                  {!lesson.read ? (
                    <Button
                      className="mt-3"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await completeLessonAction(locale, courseId, lesson.id);
                          router.refresh();
                        })
                      }
                    >
                      <Check />
                      {t("markRead")}
                    </Button>
                  ) : (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-bold text-positive">
                      <Check className="size-4" />
                      {t("read")}
                    </p>
                  )}
                </CardBody>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
