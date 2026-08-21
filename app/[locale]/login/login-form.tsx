"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { requestCodeAction, type AuthState } from "@/lib/auth/login-actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" full disabled={pending}>
      {label}
      <ArrowRight />
    </Button>
  );
}

export function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, formAction] = useActionState<AuthState, FormData>(
    requestCodeAction,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />

      <Field
        label={t("phoneLabel")}
        error={state.error ? t(`errors.${state.error}`) : undefined}
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex h-10 shrink-0 items-center rounded-[var(--radius-control)] border border-ink-200 bg-ink-50 px-3 text-sm font-bold text-ink-500">
            +976
          </span>
          <Input
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            required
            autoFocus
            placeholder={t("phonePlaceholder")}
            className="tabular"
          />
        </div>
      </Field>

      <SubmitButton label={t("sendCode")} />
    </form>
  );
}
