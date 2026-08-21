"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { verifyCodeAction, type AuthState } from "@/lib/auth/login-actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" full disabled={pending}>
      {label}
    </Button>
  );
}

export function VerifyForm({ phone }: { phone: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, formAction] = useActionState<AuthState, FormData>(
    verifyCodeAction,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="phone" value={phone} />

      <Field
        label={t("codeLabel")}
        error={state.error ? t(`errors.${state.error}`) : undefined}
      >
        <Input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={4}
          required
          autoFocus
          placeholder="0000"
          className="h-14 text-center text-2xl font-extrabold tracking-[0.5em] tabular"
        />
      </Field>

      <SubmitButton label={t("verify")} />
    </form>
  );
}
