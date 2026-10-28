"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActorRole } from "@/lib/auth/guards";
import {
  applyCourseCompletion,
  certificateSerial,
  gradeQuiz,
  type Answer,
} from "./grading";

export type AcademyResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

async function requireOperator() {
  return requireActorRole("OPERATOR");
}

export async function enrollAction(locale: string, courseId: string) {
  const session = await requireOperator();

  await db.enrollment.upsert({
    where: { userId_courseId: { userId: session.uid, courseId } },
    create: { userId: session.uid, courseId },
    update: {},
  });

  revalidatePath(`/${locale}/operator/academy`);
}

export async function completeLessonAction(
  locale: string,
  courseId: string,
  lessonId: string,
) {
  const session = await requireOperator();

  // Reading a lesson implies enrolment, so don't make people press two buttons.
  const enrollment = await db.enrollment.upsert({
    where: { userId_courseId: { userId: session.uid, courseId } },
    create: { userId: session.uid, courseId },
    update: {},
  });

  await db.lessonCompletion.upsert({
    where: {
      enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId },
    },
    create: { enrollmentId: enrollment.id, lessonId },
    update: {},
  });

  revalidatePath(`/${locale}/operator/academy`);
}

export type QuizOutcome = {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  pointsAwarded: number;
  levelledUp: boolean;
  level: string;
  certificateSerial: string | null;
  answers: { questionId: string; correct: boolean; correctIndex: number }[];
};

/**
 * Grades an attempt and, on a pass, issues the certificate and moves the
 * operator's level. Grading happens server-side against the stored answers —
 * the client never sees which option is correct until it submits.
 */
export async function submitQuizAction(
  locale: string,
  courseId: string,
  answers: Answer[],
): Promise<AcademyResult<QuizOutcome>> {
  const session = await requireOperator();

  const course = await db.course.findUnique({
    where: { id: courseId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!course) return { ok: false, error: "notFound" };

  const settings = await db.platformSettings.findUniqueOrThrow({
    where: { id: "singleton" },
  });

  const result = gradeQuiz(
    course.questions.map((q) => ({ id: q.id, correctIndex: q.correctIndex })),
    answers,
  );

  const enrollment = await db.enrollment.upsert({
    where: { userId_courseId: { userId: session.uid, courseId } },
    create: { userId: session.uid, courseId },
    update: {},
  });

  const existingCertificate = await db.certificate.findUnique({
    where: { userId_courseId: { userId: session.uid, courseId } },
  });

  let pointsAwarded = 0;
  let levelledUp = false;
  let level = "BEGINNER";
  let serial: string | null = existingCertificate?.serial ?? null;

  await db.$transaction(async (tx) => {
    await tx.quizAttempt.create({
      data: {
        enrollmentId: enrollment.id,
        score: result.score,
        totalPoints: result.total,
        passed: result.passed,
        answers: result.answers,
      },
    });

    await tx.enrollment.update({
      where: { id: enrollment.id },
      data: {
        status: result.passed ? "COMPLETED" : "FAILED",
        completedAt: result.passed ? new Date() : null,
      },
    });

    const profile = await tx.operatorProfile.findUnique({
      where: { userId: session.uid },
    });
    level = profile?.level ?? "BEGINNER";

    // Points and the certificate are awarded once — retaking a passed course
    // shouldn't farm level-ups.
    if (result.passed && !existingCertificate && profile) {
      const issuedAt = new Date();
      serial = certificateSerial(course.slug, session.uid, issuedAt);

      await tx.certificate.create({
        data: {
          userId: session.uid,
          courseId,
          serial,
          score: result.percent,
          issuedAt,
        },
      });

      const progression = applyCourseCompletion(profile.points, course.pointsAward, {
        intermediateAt: settings.levelUpIntermediate,
        advancedAt: settings.levelUpAdvanced,
      });

      pointsAwarded = course.pointsAward;
      levelledUp = progression.levelledUp;
      level = progression.level;

      await tx.operatorProfile.update({
        where: { userId: session.uid },
        data: { points: progression.points, level: progression.level },
      });

      // Certification widens the work an operator can be matched to, so add the
      // course's category to their skills if it isn't already there.
      if (!profile.skills.includes(course.category)) {
        await tx.operatorProfile.update({
          where: { userId: session.uid },
          data: { skills: { push: course.category } },
        });
      }

      await tx.notification.create({
        data: {
          userId: session.uid,
          type: "CERTIFICATE_EARNED",
          data: { courseTitle: course.titleMn, serial, points: course.pointsAward },
          link: `/operator/academy/${course.slug}`,
        },
      });

      if (progression.levelledUp) {
        await tx.notification.create({
          data: {
            userId: session.uid,
            type: "LEVEL_UP",
            data: { level: progression.level },
            link: `/operator`,
          },
        });
      }
    }
  });

  revalidatePath(`/${locale}/operator/academy`);
  revalidatePath(`/${locale}/operator/academy/${course.slug}`);
  revalidatePath(`/${locale}/operator`);

  return {
    ok: true,
    data: {
      score: result.score,
      total: result.total,
      percent: result.percent,
      passed: result.passed,
      pointsAwarded,
      levelledUp,
      level,
      certificateSerial: serial,
      answers: result.answers.map((a) => ({
        questionId: a.questionId,
        correct: a.correct,
        correctIndex: a.correctIndex,
      })),
    },
  };
}
