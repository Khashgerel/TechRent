/**
 * Quiz grading and what passing a course is worth.
 *
 * Kept free of the database so the rules that decide whether someone earns a
 * certificate — and the level it pushes them to — can be tested directly. The
 * level thresholds are the same ones the booking flow uses, which is what makes
 * the Academy actually connect to getting work rather than being a side feature.
 */

export const PASS_PERCENT = 70;

export type Question = {
  id: string;
  correctIndex: number;
};

export type Answer = {
  questionId: string;
  /** Null when the question was left blank. */
  selectedIndex: number | null;
};

export type GradedAnswer = Answer & {
  correct: boolean;
  correctIndex: number;
};

export type QuizResult = {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  answers: GradedAnswer[];
};

export function gradeQuiz(questions: Question[], answers: Answer[]): QuizResult {
  const byId = new Map(answers.map((a) => [a.questionId, a]));

  const graded: GradedAnswer[] = questions.map((question) => {
    const answer = byId.get(question.id);
    const selectedIndex = answer?.selectedIndex ?? null;

    return {
      questionId: question.id,
      selectedIndex,
      correctIndex: question.correctIndex,
      // An unanswered question is wrong, not skipped — otherwise leaving
      // everything blank would score 100%.
      correct: selectedIndex !== null && selectedIndex === question.correctIndex,
    };
  });

  const score = graded.filter((a) => a.correct).length;
  const total = questions.length;
  const percent = total === 0 ? 0 : Math.round((score / total) * 100);

  return { score, total, percent, passed: percent >= PASS_PERCENT, answers: graded };
}

/** Serial numbers are shown on the certificate, so they need to look deliberate. */
export function certificateSerial(courseSlug: string, userId: string, issuedAt: Date) {
  const year = issuedAt.getFullYear();
  const prefix = courseSlug.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase();
  const suffix = userId.slice(-6).toUpperCase();
  return `TR-${year}-${prefix}-${suffix}`;
}

export type LevelName = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export function levelForPoints(
  points: number,
  intermediateAt: number,
  advancedAt: number,
): LevelName {
  if (points >= advancedAt) return "ADVANCED";
  if (points >= intermediateAt) return "INTERMEDIATE";
  return "BEGINNER";
}

/**
 * What finishing a course does to an operator's standing. Returned together so
 * the UI can say "you levelled up" in the same breath as "you passed".
 */
export function applyCourseCompletion(
  currentPoints: number,
  pointsAward: number,
  thresholds: { intermediateAt: number; advancedAt: number },
) {
  const before = levelForPoints(
    currentPoints,
    thresholds.intermediateAt,
    thresholds.advancedAt,
  );
  const points = currentPoints + pointsAward;
  const after = levelForPoints(
    points,
    thresholds.intermediateAt,
    thresholds.advancedAt,
  );

  return { points, level: after, levelledUp: after !== before };
}

/** Progress through a course, for the catalogue card and the course header. */
export function courseProgress(completedLessons: number, totalLessons: number) {
  if (totalLessons === 0) return 0;
  return Math.round((completedLessons / totalLessons) * 100);
}
