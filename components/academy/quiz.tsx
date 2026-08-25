"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Award, Check, Loader2, Lock, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { PASS_PERCENT } from "@/lib/academy/grading";
import { submitQuizAction, type QuizOutcome } from "@/lib/academy/actions";
import { cn } from "@/lib/utils";

export type QuizQuestionData = {
  id: string;
  prompt: string;
  options: string[];
  explanation: string | null;
};

/**
 * The quiz never ships the correct answers to the browser — grading happens on
 * the server, and only the graded result comes back. That keeps a certificate
 * worth something.
 */
export function Quiz({
  courseId,
  questions,
  unlocked,
  alreadyPassed,
}: {
  courseId: string;
  questions: QuizQuestionData[];
  unlocked: boolean;
  alreadyPassed: boolean;
}) {
  const t = useTranslations("academy.quiz");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [started, setStarted] = useState(false);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [outcome, setOutcome] = useState<QuizOutcome | null>(null);

  if (!unlocked && !alreadyPassed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <Lock className="size-4 text-ink-400" />
        </CardHeader>
        <CardBody>
          <p className="text-[13px] text-ink-500">{t("locked")}</p>
        </CardBody>
      </Card>
    );
  }

  if (outcome) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{outcome.passed ? t("passed") : t("failed")}</CardTitle>
          <Badge tone={outcome.passed ? "positive" : "caution"}>
            {t("score", {
              score: outcome.score,
              total: outcome.total,
              percent: outcome.percent,
            })}
          </Badge>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          {outcome.passed && outcome.pointsAwarded > 0 ? (
            <Alert tone="positive">
              <p className="font-bold">
                {t("pointsEarned", { points: outcome.pointsAwarded })}
              </p>
              {outcome.levelledUp ? (
                <p className="mt-0.5">{t("levelUp", { level: outcome.level })}</p>
              ) : null}
              {outcome.certificateSerial ? (
                <p className="mt-0.5 inline-flex items-center gap-1.5">
                  <Award className="size-4" />
                  {t("certificateIssued", { serial: outcome.certificateSerial })}
                </p>
              ) : null}
            </Alert>
          ) : null}

          <ul className="flex flex-col gap-2.5">
            {questions.map((question, index) => {
              const graded = outcome.answers.find((a) => a.questionId === question.id);
              const chosen = selected[question.id];

              return (
                <li
                  key={question.id}
                  className="rounded-[var(--radius-control)] border border-ink-200 p-3"
                >
                  <div className="flex items-start gap-2">
                    {graded?.correct ? (
                      <Check className="mt-0.5 size-4 shrink-0 text-positive" />
                    ) : (
                      <X className="mt-0.5 size-4 shrink-0 text-critical" />
                    )}
                    <p className="text-[13px] font-bold text-ink-900">
                      {index + 1}. {question.prompt}
                    </p>
                  </div>

                  <p className="mt-1.5 pl-6 text-[12px] text-ink-500">
                    {t("yourAnswer")}:{" "}
                    <span className="font-semibold">
                      {chosen === undefined
                        ? t("unanswered")
                        : question.options[chosen]}
                    </span>
                  </p>

                  {!graded?.correct && graded ? (
                    <p className="pl-6 text-[12px] text-positive">
                      {t("correctAnswer")}:{" "}
                      <span className="font-semibold">
                        {question.options[graded.correctIndex]}
                      </span>
                    </p>
                  ) : null}

                  {question.explanation ? (
                    <p className="mt-1 pl-6 text-[12px] italic text-ink-500">
                      {question.explanation}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {!outcome.passed ? (
            <Button
              onClick={() => {
                setOutcome(null);
                setSelected({});
                setStarted(true);
              }}
            >
              {t("retry")}
            </Button>
          ) : null}
        </CardBody>
      </Card>
    );
  }

  if (!started) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          {alreadyPassed ? <Badge tone="positive">{PASS_PERCENT}%+</Badge> : null}
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          <p className="text-[13px] text-ink-500">
            {t("intro", { count: questions.length, pass: PASS_PERCENT })}
          </p>
          <Button onClick={() => setStarted(true)}>{t("start")}</Button>
        </CardBody>
      </Card>
    );
  }

  const answered = Object.keys(selected).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <span className="text-[12px] font-semibold text-ink-500">
          {answered} / {questions.length}
        </span>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        {questions.map((question, index) => (
          <fieldset key={question.id} className="flex flex-col gap-2">
            <legend className="mb-1 text-[13px] font-bold text-ink-900">
              {index + 1}. {question.prompt}
            </legend>

            {question.options.map((option, optionIndex) => {
              const isChosen = selected[question.id] === optionIndex;

              return (
                <label
                  key={optionIndex}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-control)] border px-3 py-2 text-[13px] transition-colors",
                    isChosen
                      ? "border-brand-500 bg-brand-50 font-semibold text-ink-900"
                      : "border-ink-200 text-ink-700 hover:border-ink-300",
                  )}
                >
                  <input
                    type="radio"
                    name={question.id}
                    className="size-4 accent-[var(--color-brand-600)]"
                    checked={isChosen}
                    onChange={() =>
                      setSelected((prev) => ({ ...prev, [question.id]: optionIndex }))
                    }
                  />
                  {option}
                </label>
              );
            })}
          </fieldset>
        ))}

        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await submitQuizAction(
                locale,
                courseId,
                questions.map((q) => ({
                  questionId: q.id,
                  selectedIndex: selected[q.id] ?? null,
                })),
              );

              if (result.ok) {
                setOutcome(result.data);
                router.refresh();
              }
            })
          }
        >
          {pending ? <Loader2 className="animate-spin" /> : null}
          {t("submit")}
        </Button>
      </CardBody>
    </Card>
  );
}
