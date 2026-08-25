import { useLocale, useTranslations } from "next-intl";
import { Award, BookOpen, Clock, Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OperatorLevel } from "@/lib/generated/prisma/enums";

export type CourseCardData = {
  slug: string;
  titleMn: string;
  titleEn: string;
  descriptionMn: string;
  descriptionEn: string;
  coverColor: string;
  level: OperatorLevel;
  durationMin: number;
  pointsAward: number;
  lessonCount: number;
  questionCount: number;
  enrolled: boolean;
  completed: boolean;
  progress: number;
  aboveLevel: boolean;
};

export function CourseCard({ course }: { course: CourseCardData }) {
  const t = useTranslations("academy");
  const locale = useLocale();

  const title = locale === "en" ? course.titleEn : course.titleMn;
  const description = locale === "en" ? course.descriptionEn : course.descriptionMn;

  const action = course.completed
    ? t("review")
    : course.enrolled
      ? t("continue")
      : t("start");

  return (
    <Link
      href={`/operator/academy/${course.slug}`}
      className="card group flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[var(--shadow-raised)]"
    >
      <div
        className="relative flex h-24 items-end p-4"
        style={{
          backgroundImage: `linear-gradient(135deg, ${course.coverColor}, ${course.coverColor}cc)`,
        }}
      >
        <BookOpen className="absolute right-4 top-4 size-7 text-white/40" />
        <Badge tone="neutral" className="bg-white/90 backdrop-blur">
          {t("levelBadge", { level: course.level })}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[15px] font-bold leading-snug text-ink-900">{title}</p>
          {course.completed ? (
            <Award className="size-5 shrink-0 text-accent-500" />
          ) : course.aboveLevel ? (
            <Lock className="size-4 shrink-0 text-ink-400" />
          ) : null}
        </div>

        <p className="line-clamp-2 text-[13px] leading-relaxed text-ink-500">
          {description}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-400">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="size-3.5" />
            {t("lessons", { count: course.lessonCount })}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {t("duration", { minutes: course.durationMin })}
          </span>
          <span className="font-bold text-accent-600">
            {t("points", { points: course.pointsAward })}
          </span>
        </div>

        {course.enrolled && !course.completed ? (
          <div className="mt-1">
            <span className="relative block h-1.5 overflow-hidden rounded-full bg-ink-100">
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-brand-600"
                style={{ width: `${Math.max(course.progress, 3)}%` }}
              />
            </span>
            <span className="mt-1 block text-[11px] font-semibold text-ink-500">
              {t("progress", { percent: course.progress })}
            </span>
          </div>
        ) : null}

        <span
          className={cn(
            "mt-auto pt-2 text-[13px] font-bold",
            course.completed ? "text-positive" : "text-brand-600",
          )}
        >
          {course.completed ? t("completed") : action} →
        </span>
      </div>
    </Link>
  );
}
