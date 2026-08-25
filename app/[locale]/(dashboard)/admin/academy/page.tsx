import { getTranslations, setRequestLocale } from "next-intl/server";
import { Award, BookOpen, GraduationCap, Users } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { StatTile } from "@/components/ui/stat-tile";
import { CourseToggle } from "@/components/admin/course-toggle";
import { requireRole } from "@/lib/auth/guards";
import { getAcademyAdmin } from "@/lib/admin/queries";

export default async function AdminAcademyPage({
  params,
}: PageProps<"/[locale]/admin/academy">) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requireRole(locale, "ADMIN");
  const t = await getTranslations();
  const { courses, passed, attempts } = await getAcademyAdmin();

  const certificates = courses.reduce((sum, c) => sum + c._count.certificates, 0);
  const enrollments = courses.reduce((sum, c) => sum + c._count.enrollments, 0);

  return (
    <>
      <PageHeader
        title={t("admin.academy.title")}
        description={t("admin.academy.subtitle")}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={BookOpen}
          label={t("admin.academy.courses")}
          value={courses.length}
          hint={t("admin.academy.publishedCount", {
            count: courses.filter((c) => c.published).length,
          })}
          tone="brand"
        />
        <StatTile
          icon={Users}
          label={t("admin.academy.enrollments")}
          value={enrollments}
          tone="neutral"
        />
        <StatTile
          icon={GraduationCap}
          label={t("admin.academy.passed")}
          value={passed}
          hint={t("admin.academy.attempts", { count: attempts })}
          tone="accent"
        />
        <StatTile
          icon={Award}
          label={t("admin.academy.certificates")}
          value={certificates}
          tone="positive"
        />
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="size-8" />}
          title={t("admin.academy.none")}
        />
      ) : (
        <Card>
          <div className="divide-y divide-ink-200/70">
            {courses.map((course) => (
              <div
                key={course.id}
                className="flex flex-wrap items-center gap-3 px-5 py-3.5"
              >
                <span
                  className="size-9 shrink-0 rounded-[var(--radius-control)]"
                  style={{ backgroundColor: course.coverColor }}
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-ink-900">
                    {locale === "en" ? course.titleEn : course.titleMn}
                  </p>
                  <p className="truncate text-[12px] text-ink-500">
                    {t(`equipment.category.${course.category}`)} ·{" "}
                    {t(`operatorLevel.${course.level}`)} ·{" "}
                    {t("academy.lessons", { count: course._count.lessons })} ·{" "}
                    {t("academy.questions", { count: course._count.questions })}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-4 text-[12px] text-ink-500">
                  <span className="tabular">
                    {t("admin.academy.enrolled", { count: course._count.enrollments })}
                  </span>
                  <span className="tabular">
                    {t("admin.academy.certified", {
                      count: course._count.certificates,
                    })}
                  </span>
                  <Badge tone={course.published ? "positive" : "neutral"}>
                    {course.published
                      ? t("admin.academy.published")
                      : t("admin.academy.draft")}
                  </Badge>
                </div>

                <CourseToggle courseId={course.id} published={course.published} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
