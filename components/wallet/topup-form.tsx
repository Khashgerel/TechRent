"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Wallet } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { formatMNT } from "@/lib/money";
import { MAX_TOPUP, MIN_TOPUP } from "@/lib/validation/payment";
import { createTopupAction } from "@/app/[locale]/(dashboard)/wallet/actions";
import { cn } from "@/lib/utils";

/** Amounts worth one tap: a realistic spread for equipment deposits. */
const PRESETS = [100_000, 500_000, 2_000_000, 10_000_000];

export function TopupForm({ disabled }: { disabled?: boolean }) {
  const t = useTranslations("wallet");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [amount, setAmount] = useState("500000");
  const [error, setError] = useState<string | null>(null);

  const parsed = Number(amount);
  const valid =
    Number.isInteger(parsed) && parsed >= MIN_TOPUP && parsed <= MAX_TOPUP;

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await createTopupAction(locale, { amount: parsed });

      if (!result.ok) {
        setError(result.fieldErrors?.amount ?? result.error);
        return;
      }

      router.refresh();
    });
  };

  const message = (key: string) =>
    t.has(`errors.${key}`) ? t(`errors.${key}`) : t("errors.generic");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("topupTitle")}</CardTitle>
        <span className="text-[12px] font-semibold text-ink-500">
          {t("sandboxBadge")}
        </span>
      </CardHeader>

      <CardBody className="flex flex-col gap-4">
        <p className="text-[13px] text-ink-500">{t("topupHint")}</p>

        {disabled ? <Alert tone="caution">{t("errors.notConfigured")}</Alert> : null}

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={pending || disabled}
              onClick={() => {
                setError(null);
                setAmount(String(preset));
              }}
              className={cn(
                "rounded-[var(--radius-control)] border px-3 py-1.5 text-[13px] font-semibold transition-colors disabled:opacity-50",
                Number(amount) === preset
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-ink-200 text-ink-600 hover:border-ink-300 hover:bg-ink-50",
              )}
            >
              {formatMNT(preset, locale)}
            </button>
          ))}
        </div>

        <Field
          label={t("amountLabel")}
          hint={t("amountHint", {
            min: formatMNT(MIN_TOPUP, locale),
            max: formatMNT(MAX_TOPUP, locale),
          })}
          error={error ? message(error) : undefined}
        >
          <Input
            type="number"
            inputMode="numeric"
            min={MIN_TOPUP}
            max={MAX_TOPUP}
            step={100}
            value={amount}
            disabled={pending || disabled}
            onChange={(e) => {
              setError(null);
              setAmount(e.target.value);
            }}
            className="tabular"
          />
        </Field>

        <div>
          <Button type="button" disabled={pending || disabled || !valid} onClick={submit}>
            {pending ? <Loader2 className="animate-spin" /> : <Wallet />}
            {t("createInvoice")}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
