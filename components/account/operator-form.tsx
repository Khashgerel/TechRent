"use client";

import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { AIMAGS, districtsOf } from "@/lib/locations";
import { EQUIPMENT_CATEGORIES } from "@/lib/equipment";
import {
  operatorProfileSchema,
  type OperatorProfileInput,
  type OperatorProfileValues,
} from "@/lib/validation/profile";
import { becomeOperatorAction } from "@/lib/account/role-actions";

export function OperatorForm({
  defaults,
}: {
  defaults?: Partial<OperatorProfileValues>;
}) {
  const t = useTranslations("account.operator");
  const tCat = useTranslations("equipment.category");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<OperatorProfileValues, unknown, OperatorProfileInput>({
    resolver: zodResolver(operatorProfileSchema),
    defaultValues: {
      yearsExperience: 3,
      skills: [],
      aimag: "Улаанбаатар",
      district: "",
      dailyRate: 150000,
      available: true,
      bio: "",
      ...defaults,
    },
  });

  const aimag = useWatch({ control, name: "aimag" });
  const districts = districtsOf(aimag ?? "");
  const err = (key: keyof OperatorProfileValues) =>
    errors[key] ? tv(errors[key]?.message ?? "invalid") : undefined;

  const onSubmit = (values: OperatorProfileInput) => {
    setFormError(null);
    startTransition(async () => {
      const result = await becomeOperatorAction(locale, values);
      if (!result.ok) {
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
          setError(field as keyof OperatorProfileValues, { message });
        }
        if (!result.fieldErrors) setFormError(result.error);
        return;
      }
      router.push("/operator");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>{t("cardTitle")}</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-5">
          {formError ? <Alert tone="critical">{tv("generic")}</Alert> : null}

          {/* Skills are a hard gate in the matching engine: an operator with
              none would never be offered work, so at least one is required. */}
          <Controller
            control={control}
            name="skills"
            render={({ field }) => (
              <Field label={t("skills")} error={err("skills")}>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT_CATEGORIES.map((category) => {
                    const on = (field.value ?? []).includes(category);
                    return (
                      <button
                        key={category}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          field.onChange(
                            on
                              ? (field.value ?? []).filter((c) => c !== category)
                              : [...(field.value ?? []), category],
                          )
                        }
                        className={`rounded-full border px-3 py-1.5 text-[13px] font-bold transition-colors ${
                          on
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-ink-200 text-ink-600 hover:border-ink-300"
                        }`}
                      >
                        {tCat(category)}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t("yearsExperience")} error={err("yearsExperience")}>
              <Input {...register("yearsExperience")} type="number" min={0} max={60} />
            </Field>

            <Field label={t("dailyRate")} error={err("dailyRate")}>
              <Input {...register("dailyRate")} type="number" step={1000} className="tabular" />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t("aimag")} error={err("aimag")}>
              <Select {...register("aimag")}>
                {AIMAGS.map((item) => (
                  <option key={item.name} value={item.name}>
                    {locale === "en" ? item.nameEn : item.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t("district")}>
              <Select {...register("district")} disabled={districts.length === 0}>
                <option value="">—</option>
                {districts.map((item) => (
                  <option key={item.name} value={item.name}>
                    {locale === "en" ? item.nameEn : item.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label={t("bio")}>
            <Textarea {...register("bio")} rows={3} />
          </Field>

          <label className="flex items-center gap-2.5 text-sm font-semibold text-ink-700">
            <input type="checkbox" {...register("available")} className="size-4" />
            {t("available")}
          </label>

          <Button type="submit" size="lg" disabled={pending}>
            {t("submit")}
            <ArrowRight />
          </Button>
        </CardBody>
      </Card>
    </form>
  );
}
