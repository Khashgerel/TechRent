import { describe, expect, it } from "vitest";
import {
  applyCourseCompletion,
  certificateSerial,
  courseProgress,
  gradeQuiz,
  levelForPoints,
  PASS_PERCENT,
  type Question,
} from "../grading";

const questions: Question[] = [
  { id: "q1", correctIndex: 1 },
  { id: "q2", correctIndex: 0 },
  { id: "q3", correctIndex: 2 },
  { id: "q4", correctIndex: 3 },
];

const answer = (id: string, selectedIndex: number | null) => ({
  questionId: id,
  selectedIndex,
});

describe("gradeQuiz", () => {
  it("scores a perfect run", () => {
    const result = gradeQuiz(questions, [
      answer("q1", 1),
      answer("q2", 0),
      answer("q3", 2),
      answer("q4", 3),
    ]);

    expect(result.score).toBe(4);
    expect(result.percent).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("counts an unanswered question as wrong", () => {
    const result = gradeQuiz(questions, [
      answer("q1", 1),
      answer("q2", 0),
      answer("q3", null),
      answer("q4", 3),
    ]);

    expect(result.score).toBe(3);
    expect(result.answers.find((a) => a.questionId === "q3")?.correct).toBe(false);
  });

  it("gives nothing for submitting a blank quiz", () => {
    const result = gradeQuiz(
      questions,
      questions.map((q) => answer(q.id, null)),
    );

    expect(result.score).toBe(0);
    expect(result.percent).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("treats missing answers the same as blank ones", () => {
    const result = gradeQuiz(questions, [answer("q1", 1)]);

    expect(result.score).toBe(1);
    expect(result.total).toBe(4);
    expect(result.passed).toBe(false);
  });

  it("passes at the threshold and fails just below it", () => {
    // 3 of 4 is 75%, above the 70% bar; 2 of 4 is 50%, below it.
    expect(gradeQuiz(questions, [
      answer("q1", 1),
      answer("q2", 0),
      answer("q3", 2),
      answer("q4", 0),
    ]).passed).toBe(true);

    expect(gradeQuiz(questions, [
      answer("q1", 1),
      answer("q2", 0),
      answer("q3", 0),
      answer("q4", 0),
    ]).passed).toBe(false);

    expect(PASS_PERCENT).toBe(70);
  });

  it("reports the right answer for every question, so results can be explained", () => {
    const result = gradeQuiz(questions, [answer("q1", 0)]);
    const q1 = result.answers.find((a) => a.questionId === "q1")!;

    expect(q1.selectedIndex).toBe(0);
    expect(q1.correctIndex).toBe(1);
    expect(q1.correct).toBe(false);
  });

  it("does not divide by zero on an empty quiz", () => {
    const result = gradeQuiz([], []);
    expect(result.percent).toBe(0);
    expect(result.passed).toBe(false);
  });
});

describe("course completion", () => {
  const thresholds = { intermediateAt: 500, advancedAt: 1500 };

  it("adds the award to the operator's points", () => {
    const result = applyCourseCompletion(300, 120, thresholds);
    expect(result.points).toBe(420);
    expect(result.levelledUp).toBe(false);
    expect(result.level).toBe("BEGINNER");
  });

  it("reports a level-up when the award crosses a threshold", () => {
    const result = applyCourseCompletion(430, 120, thresholds);
    expect(result.points).toBe(550);
    expect(result.level).toBe("INTERMEDIATE");
    expect(result.levelledUp).toBe(true);
  });

  it("can carry someone to the top level", () => {
    const result = applyCourseCompletion(1400, 200, thresholds);
    expect(result.level).toBe("ADVANCED");
    expect(result.levelledUp).toBe(true);
  });

  it("does not report a level-up when already there", () => {
    const result = applyCourseCompletion(1600, 200, thresholds);
    expect(result.level).toBe("ADVANCED");
    expect(result.levelledUp).toBe(false);
  });

  it("uses the same thresholds as the booking flow", () => {
    expect(levelForPoints(499, 500, 1500)).toBe("BEGINNER");
    expect(levelForPoints(500, 500, 1500)).toBe("INTERMEDIATE");
    expect(levelForPoints(1500, 500, 1500)).toBe("ADVANCED");
  });
});

describe("certificates", () => {
  it("builds a stable, readable serial", () => {
    const serial = certificateSerial(
      "excavator-basics",
      "cmt6k9kl30006zkv5ri54sm4a",
      new Date("2026-08-24"),
    );

    expect(serial).toBe("TR-2026-EXCA-54SM4A");
  });

  it("gives different operators different serials for the same course", () => {
    const a = certificateSerial("site-safety", "user-aaaaaa", new Date("2026-01-01"));
    const b = certificateSerial("site-safety", "user-bbbbbb", new Date("2026-01-01"));
    expect(a).not.toBe(b);
  });
});

describe("courseProgress", () => {
  it("reports progress as a whole percentage", () => {
    expect(courseProgress(0, 4)).toBe(0);
    expect(courseProgress(1, 4)).toBe(25);
    expect(courseProgress(4, 4)).toBe(100);
  });

  it("handles a course with no lessons", () => {
    expect(courseProgress(0, 0)).toBe(0);
  });
});
