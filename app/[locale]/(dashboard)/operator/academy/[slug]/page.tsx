import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Award, BookOpen, Clock } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { LessonList } from "@/components/academy/lesson-list";
import { Quiz } from "@/components/academy/quiz";
import { requireRole } from "@/lib/auth/guards";
import { getCourse } from "@/lib/academy/queries";
import { formatDate } from "@/lib/dates";

type Option = { mn: string; en: string };

export default async function CoursePage({
  params,
}: PageProps<"/[locale]/operator/academy/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const session = await requireRole(locale, "OPERATOR");
  const t = await getTranslations();

  const detail = await getCourse(slug, session.uid);
  if (!detail) notFound();

  const { course, certificate, completedLessonIds, progress, quizUnlocked } = detail;
  const isEn = locale === "en";

  return (
    <>
      <PageHeader
        title={isEn ? course.titleEn : course.titleMn}
        description={isEn ? course.descriptionEn : course.descriptionMn}
        actions={
          <Badge tone={certificate ? "positive" : "brand"}>
            {certificate
              ? t("academy.completed")
              : t("academy.levelBadge", { level: course.level })}
          </Badge>
        }
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="flex flex-col gap-4 lg:col-span-3">
          <LessonList
            courseId={course.id}
            lessons={course.lessons.map((lesson) => ({
              id: lesson.id,
              order: lesson.order,
              title: isEn ? lesson.titleEn : lesson.titleMn,
              content: isEn ? lesson.contentEn : lesson.contentMn,
              durationMin: lesson.durationMin,
              read: completedLessonIds.has(lesson.id),
            }))}
          />

          <Quiz
            courseId={course.id}
            unlocked={quizUnlocked}
            alreadyPassed={Boolean(certificate)}
            questions={course.questions.map((question) => ({
              id: question.id,
              prompt: isEn ? question.promptEn : question.promptMn,
              options: (question.options as Option[]).map((o) => (isEn ? o.en : o.mn)),
              explanation: isEn ? question.explanationEn : question.explanationMn,
            }))}
          />
        </div>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardBody className="flex flex-col gap-3">
              <div>
                <p className="text-[12px] font-semibold text-ink-500">
                  {t("academy.progress", { percent: progress })}
                </p>
                <span className="mt-1.5 relative block h-2 overflow-hidden rounded-full bg-ink-100">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-brand-600"
                    style={{ width: `${Math.max(progress, 3)}%` }}
                  />
                </span>
              </div>

              <dl className="flex flex-col gap-2 border-t border-ink-200/70 pt-3">
                <Row
                  icon={<BookOpen className="size-3.5 text-ink-400" />}
                  label={t("academy.lessons", { count: course.lessons.length })}
                  value={t("academy.questions", { count: course.questions.length })}
                />
                <Row
                  icon={<Clock className="size-3.5 text-ink-400" />}
                  label={t("academy.duration", { minutes: course.durationMin })}
                  value={t("academy.points", { points: course.pointsAward })}
                />
              </dl>
            </CardBody>
          </Card>

          {certificate ? (
            <Card className="border-accent-300 bg-accent-50">
              <CardHeader className="border-accent-200">
                <CardTitle>{t("academy.certificate.title")}</CardTitle>
                <Award className="size-5 text-accent-600" />
              </CardHeader>
              <CardBody className="flex flex-col gap-2">
                <Row
                  label={t("academy.certificate.serial")}
                  value={certificate.serial}
                />
                <Row
                  label={t("academy.certificate.score")}
                  value={`${certificate.score}%`}
                />
                <Row
                  label={t("academy.certificate.issued")}
                  value={formatDate(certificate.issuedAt, locale)}
                />
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-500">
        {icon}
        {label}
      </span>
      <span className="text-[13px] font-bold text-ink-800">{value}</span>
    </div>
  );
}
