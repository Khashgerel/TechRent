"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/feedback";
import { staffLoginAction, type StaffLoginState } from "./actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" full disabled={pending}>
      {label}
      <ArrowRight />
    </Button>
  );
}

export function StaffLoginForm() {
  const t = useTranslations("staffAuth");
  const [state, formAction] = useActionState<StaffLoginState, FormData>(
    staffLoginAction,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error ? (
        <Alert tone="critical">{t(`errors.${state.error}`)}</Alert>
      ) : null}

      <Field label={t("username")}>
        <Input
          name="username"
          autoComplete="username"
          autoFocus
          required
          spellCheck={false}
        />
      </Field>

      <Field label={t("password")}>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <SubmitButton label={t("submit")} />
    </form>
  );
}
