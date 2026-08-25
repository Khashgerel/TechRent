import "server-only";

import { db } from "@/lib/db";
import { courseProgress } from "./grading";

/** Catalogue view: every published course plus this operator's standing in it. */
export async function getCourseCatalogue(userId: string) {
  const [courses, enrollments, certificates, profile] = await Promise.all([
    db.course.findMany({
      where: { published: true },
      include: { _count: { select: { lessons: true, questions: true } } },
      orderBy: [{ level: "asc" }, { titleMn: "asc" }],
    }),
    db.enrollment.findMany({
      where: { userId },
      include: { _count: { select: { lessonCompletions: true } } },
    }),
    db.certificate.findMany({ where: { userId } }),
    db.operatorProfile.findUnique({ where: { userId } }),
  ]);

  const enrolmentByCourse = new Map(enrollments.map((e) => [e.courseId, e]));
  const certificateByCourse = new Map(certificates.map((c) => [c.courseId, c]));

  return {
    profile,
    certificates,
    courses: courses.map((course) => {
      const enrollment = enrolmentByCourse.get(course.id);
      const certificate = certificateByCourse.get(course.id);

      return {
        ...course,
        lessonCount: course._count.lessons,
        questionCount: course._count.questions,
        enrolled: Boolean(enrollment),
        completed: enrollment?.status === "COMPLETED",
        certificate,
        progress: enrollment
          ? courseProgress(enrollment._count.lessonCompletions, course._count.lessons)
          : 0,
        // A course an operator can't be matched for yet is still worth showing —
        // it's the path to that work — but it's flagged as out of their level.
        aboveLevel:
          profile != null &&
          course.level === "ADVANCED" &&
          profile.level === "BEGINNER",
      };
    }),
  };
}

export type CourseCatalogue = Awaited<ReturnType<typeof getCourseCatalogue>>;

export async function getCourse(slug: string, userId: string) {
  const course = await db.course.findUnique({
    where: { slug },
    include: {
      lessons: { orderBy: { order: "asc" } },
      questions: { orderBy: { order: "asc" } },
    },
  });

  if (!course || !course.published) return null;

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
    include: {
      lessonCompletions: true,
      attempts: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  const certificate = await db.certificate.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
  });

  const completedLessonIds = new Set(
    enrollment?.lessonCompletions.map((c) => c.lessonId) ?? [],
  );

  return {
    course,
    enrollment,
    certificate,
    completedLessonIds,
    progress: courseProgress(completedLessonIds.size, course.lessons.length),
    // The quiz only opens once the material has actually been read.
    quizUnlocked:
      course.lessons.length > 0 && completedLessonIds.size === course.lessons.length,
    lastAttempt: enrollment?.attempts[0] ?? null,
  };
}

export type CourseDetail = NonNullable<Awaited<ReturnType<typeof getCourse>>>;

export async function getCertificates(userId: string) {
  return db.certificate.findMany({
    where: { userId },
    include: { course: true },
    orderBy: { issuedAt: "desc" },
  });
}
