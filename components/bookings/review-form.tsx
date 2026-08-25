"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Field, Textarea } from "@/components/ui/field";
import { submitReviewAction } from "@/lib/bookings/actions";
import { cn } from "@/lib/utils";

type SubjectType = "OPERATOR" | "EQUIPMENT" | "COMPANY";

/** Click-to-rate stars; keyboard users get the same via arrow keys on the group. */
function Stars({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] font-semibold text-ink-700">{label}</span>
      <div className="flex items-center gap-0.5" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n}`}
            onClick={() => onChange(n)}
            className="rounded p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                "size-5",
                n <= value
                  ? "fill-accent-400 text-accent-400"
                  : "fill-transparent text-ink-300",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReviewForm({
  bookingId,
  subjectType,
  subjectId,
  title,
}: {
  bookingId: string;
  subjectType: SubjectType;
  subjectId: string;
  title: string;
}) {
  const t = useTranslations("review");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [rating, setRating] = useState(5);
  const [punctuality, setPunctuality] = useState(5);
  const [quality, setQuality] = useState(5);
  const [care, setCare] = useState(5);
  const [comment, setComment] = useState("");

  if (done) {
    return (
      <Card>
        <CardBody>
          <Alert tone="positive">{t("submitted")}</Alert>
        </CardBody>
      </Card>
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await submitReviewAction(locale, {
        bookingId,
        subjectType,
        subjectId,
        rating,
        // Sub-scores only mean something for the side being judged on them.
        punctuality: subjectType === "OPERATOR" ? punctuality : undefined,
        quality: subjectType !== "COMPANY" ? quality : undefined,
        care: subjectType === "EQUIPMENT" ? care : undefined,
        comment,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setDone(true);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {error ? (
            <Alert tone="critical">
              {error === "alreadyReviewed" ? t("alreadyReviewed") : error}
            </Alert>
          ) : null}

          <Stars value={rating} onChange={setRating} label={t("rate")} />

          {subjectType === "OPERATOR" ? (
            <Stars
              value={punctuality}
              onChange={setPunctuality}
              label={t("punctuality")}
            />
          ) : null}
          {subjectType !== "COMPANY" ? (
            <Stars value={quality} onChange={setQuality} label={t("quality")} />
          ) : null}
          {subjectType === "EQUIPMENT" ? (
            <Stars value={care} onChange={setCare} label={t("care")} />
          ) : null}

          <Field label={t("comment")}>
            <Textarea
              rows={3}
              value={comment}
              placeholder={t("commentPlaceholder")}
              onChange={(e) => setComment(e.target.value)}
            />
          </Field>

          <Button type="submit" disabled={pending}>
            {t("submit")}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
