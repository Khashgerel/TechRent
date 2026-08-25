import { getTranslations, setRequestLocale } from "next-intl/server";
import { Award, GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { CourseCard } from "@/components/academy/course-card";
import { LevelProgress } from "@/components/operator/level-progress";
import { requireRole } from "@/lib/auth/guards";
import { getCourseCatalogue } from "@/lib/academy/queries";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";

export default async function AcademyPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireRole(locale, "OPERATOR");
  const t = await getTranslations();

  const [{ courses, certificates, profile }, settings] = await Promise.all([
    getCourseCatalogue(session.uid),
    db.platformSettings.findUniqueOrThrow({ where: { id: "singleton" } }),
  ]);

  const certificatesWithCourse = await db.certificate.findMany({
    where: { userId: session.uid },
    include: { course: true },
    orderBy: { issuedAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title={t("academy.title")}
        description={t("academy.subtitle")}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h2 className="mb-3 text-[15px] font-extrabold tracking-tight text-ink-900">
            {t("academy.catalogue")}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {courses.map((course) => (
              <CourseCard key={course.slug} course={course} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-2">
          {profile ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("operator.level")}</CardTitle>
                <Badge tone="brand">{t(`operatorLevel.${profile.level}`)}</Badge>
              </CardHeader>
              <CardBody>
                <LevelProgress
                  level={profile.level}
                  points={profile.points}
                  intermediateAt={settings.levelUpIntermediate}
                  advancedAt={settings.levelUpAdvanced}
                />
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>{t("academy.myCertificates")}</CardTitle>
              <span className="text-[12px] font-semibold text-ink-500">
                {certificates.length}
              </span>
            </CardHeader>

            {certificatesWithCourse.length ? (
              <div className="divide-y divide-ink-200/70">
                {certificatesWithCourse.map((certificate) => (
                  <div key={certificate.id} className="flex items-center gap-3 px-5 py-3">
                    <Award className="size-5 shrink-0 text-accent-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-ink-900">
                        {locale === "en"
                          ? certificate.course.titleEn
                          : certificate.course.titleMn}
                      </p>
                      <p className="truncate text-[12px] text-ink-500">
                        {certificate.serial} · {formatDate(certificate.issuedAt, locale)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[13px] font-extrabold text-positive tabular">
                      {certificate.score}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <CardBody>
                <EmptyState
                  icon={<GraduationCap className="size-8" />}
                  title={t("academy.noCertificates")}
                  description={t("academy.noCertificatesHint")}
                />
              </CardBody>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
