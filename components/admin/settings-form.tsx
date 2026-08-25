"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import {
  settingsSchema,
  type SettingsFormValues,
  type SettingsInput,
} from "@/lib/validation/admin";
import { updateSettingsAction } from "@/app/[locale]/(dashboard)/admin/actions";

export type SettingsDefaults = {
  commissionRate: number;
  depositPercent: number;
  operatorShare: number;
  levelUpIntermediate: number;
  levelUpAdvanced: number;
  pointsPerJob: number;
  pointsPerRating: number;
};

/**
 * These values are read at runtime by the matching engine and the escrow
 * planner, so a change here shows up in the next quote and the next payout
 * split — nothing is baked in at build time.
 */
export function SettingsForm({ settings }: { settings: SettingsDefaults }) {
  const t = useTranslations("admin.settings");
  const tt = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SettingsFormValues, unknown, SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      commissionPercent: Math.round(settings.commissionRate * 1000) / 10,
      depositPercent: Math.round(settings.depositPercent * 1000) / 10,
      operatorSharePercent: Math.round(settings.operatorShare * 1000) / 10,
      levelUpIntermediate: settings.levelUpIntermediate,
      levelUpAdvanced: settings.levelUpAdvanced,
      pointsPerJob: settings.pointsPerJob,
      pointsPerRating: settings.pointsPerRating,
    },
  });

  const fieldError = (key: keyof SettingsFormValues) => {
    const message = errors[key]?.message;
    if (!message) return undefined;
    const key2 = `validation.${message}`;
    return tt.has(key2) ? tt(key2) : message;
  };

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await updateSettingsAction(locale, values);

      if (!result.ok) {
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
          setError(field as keyof SettingsFormValues, { message });
        }
        setFormError(result.error);
        return;
      }

      setSaved(true);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {saved ? <Alert tone="positive">{t("saved")}</Alert> : null}
      {formError && formError !== "validation" ? (
        <Alert tone="critical">{t("saveFailed")}</Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("moneyTitle")}</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Field
            label={t("commission")}
            hint={t("commissionHint")}
            error={fieldError("commissionPercent")}
          >
            <Input
              type="number"
              step="0.1"
              className="tabular"
              {...register("commissionPercent")}
            />
          </Field>

          <Field
            label={t("deposit")}
            hint={t("depositHint")}
            error={fieldError("depositPercent")}
          >
            <Input
              type="number"
              step="1"
              className="tabular"
              {...register("depositPercent")}
            />
          </Field>

          <Field
            label={t("operatorShare")}
            hint={t("operatorShareHint")}
            error={fieldError("operatorSharePercent")}
          >
            <Input
              type="number"
              step="1"
              className="tabular"
              {...register("operatorSharePercent")}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("levelsTitle")}</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field
            label={t("intermediateAt")}
            error={fieldError("levelUpIntermediate")}
          >
            <Input type="number" className="tabular" {...register("levelUpIntermediate")} />
          </Field>

          <Field label={t("advancedAt")} error={fieldError("levelUpAdvanced")}>
            <Input type="number" className="tabular" {...register("levelUpAdvanced")} />
          </Field>

          <Field label={t("pointsPerJob")} error={fieldError("pointsPerJob")}>
            <Input type="number" className="tabular" {...register("pointsPerJob")} />
          </Field>

          <Field label={t("pointsPerRating")} error={fieldError("pointsPerRating")}>
            <Input type="number" className="tabular" {...register("pointsPerRating")} />
          </Field>
        </CardBody>
      </Card>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          {tt("common.save")}
        </Button>
      </div>
    </form>
  );
}
