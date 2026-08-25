import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Award, Briefcase, Star, Wallet } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { Avatar } from "@/components/ui/avatar";
import { BookingRow } from "@/components/bookings/booking-row";
import { AvailabilityToggle } from "@/components/operator/availability-toggle";
import { LevelProgress } from "@/components/operator/level-progress";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import {
  getOperatorIncome,
  getOperatorJobs,
  getOperatorProfile,
} from "@/lib/bookings/queries";
import { formatPlace } from "@/lib/locations";
import { formatMNT, formatMNTCompact } from "@/lib/money";

export default async function OperatorProfilePage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireRole(locale, "OPERATOR");
  const t = await getTranslations();

  const profile = await getOperatorProfile(session.uid);
  if (!profile) notFound();

  const [jobs, income, settings] = await Promise.all([
    getOperatorJobs(session.uid),
    getOperatorIncome(session.uid),
    db.platformSettings.findUniqueOrThrow({ where: { id: "singleton" } }),
  ]);

  const activeJobs = jobs.filter((j) =>
    ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"].includes(j.status),
  );

  return (
    <>
      <PageHeader
        title={t("operator.greeting", { name: session.name.split(" ")[0] })}
        description={t("operator.greetingSub")}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardBody className="flex flex-col items-center gap-3 text-center">
              <Avatar name={profile.user.name} size="lg" />
              <div>
                <p className="text-[16px] font-bold text-ink-900">
                  {profile.user.name}
                </p>
                <p className="text-[13px] text-ink-500">
                  {formatPlace(profile.aimag, profile.district, locale)}
                </p>
                <p className="text-[13px] text-ink-500">
                  {t("operator.experience", { years: profile.yearsExperience })}
                </p>
              </div>

              <AvailabilityToggle available={profile.available} />
            </CardBody>
          </Card>

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

          <Card>
            <CardHeader>
              <CardTitle>{t("operator.skills")}</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-wrap gap-1.5">
              {profile.skills.map((skill) => (
                <Badge key={skill} tone="neutral">
                  {t(`equipment.category.${skill}`)}
                </Badge>
              ))}
            </CardBody>
          </Card>

          {profile.bio ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("operator.bio")}</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-[13px] leading-relaxed text-ink-600">
                  {profile.bio}
                </p>
              </CardBody>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 lg:col-span-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatTile
              icon={Briefcase}
              label={t("operator.jobsDone")}
              value={profile.jobsDone}
              tone="brand"
            />
            <StatTile
              icon={Star}
              label={t("operator.rating")}
              value={profile.ratingAvg.toFixed(1)}
              hint={t("equipment.reviews", { count: profile.ratingCount })}
              tone="accent"
            />
            <StatTile
              icon={Award}
              label={t("operator.points")}
              value={profile.points}
              tone="positive"
            />
            <StatTile
              icon={Wallet}
              label={t("operator.income.lifetime")}
              value={formatMNTCompact(income.lifetimeIncome, locale)}
              hint={`${t("operator.dailyRate")}: ${formatMNT(profile.dailyRate, locale)}`}
              tone="neutral"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("operator.jobs.active")}</CardTitle>
              <Link
                href="/operator/jobs"
                className="text-[13px] font-bold text-brand-600 hover:text-brand-700"
              >
                {t("common.view")} →
              </Link>
            </CardHeader>

            {activeJobs.length ? (
              <div>
                {activeJobs.slice(0, 6).map((job) => (
                  <Link
                    key={job.id}
                    href={`/operator/jobs/${job.id}`}
                    className="block transition-colors hover:bg-ink-50/70"
                  >
                    <BookingRow
                      booking={{
                        id: job.id,
                        status: job.status,
                        startDate: job.startDate,
                        endDate: job.endDate,
                        totalAmount: job.totalAmount,
                        payout: job.operatorPayout,
                        title: job.order.title,
                        counterparty:
                          job.order.company.companyProfile?.companyName ??
                          job.order.company.name,
                        category: job.equipment?.category ?? "EXCAVATOR",
                        equipmentName: job.equipment
                          ? `${job.equipment.make} ${job.equipment.model}`
                          : null,
                        photo: job.equipment?.photos[0],
                      }}
                    />
                  </Link>
                ))}
              </div>
            ) : (
              <CardBody>
                <p className="text-[13px] text-ink-500">{t("operator.jobs.empty")}</p>
              </CardBody>
            )}
          </Card>

          <Link
            href="/operator/academy"
            className={buttonVariants({ variant: "outline", full: true })}
          >
            {t("nav.operator.academy")} →
          </Link>
        </div>
      </div>
    </>
  );
}
