"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { EQUIPMENT_CATEGORIES } from "@/lib/equipment";
import { AIMAGS, districtsOf } from "@/lib/locations";
import {
  orderSchema,
  type OrderFormValues,
  type OrderInput,
} from "@/lib/validation/order";
import { createOrderAction } from "@/app/[locale]/(dashboard)/company/orders/actions";

function isoDaysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function OrderForm({ defaults }: { defaults?: Partial<OrderFormValues> }) {
  const t = useTranslations();
  const tf = useTranslations("company.create");
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
  } = useForm<OrderFormValues, unknown, OrderInput>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "EXCAVATOR",
      startDate: isoDaysFromNow(3),
      endDate: isoDaysFromNow(13),
      aimag: "Улаанбаатар",
      district: "",
      needsOperator: true,
      ...defaults,
    },
  });

  const selectedAimag = useWatch({ control, name: "aimag" });
  const districts = districtsOf(selectedAimag);

  const fieldError = (key: keyof OrderFormValues) => {
    const message = errors[key]?.message;
    if (!message) return undefined;
    const key2 = `validation.${message}`;
    return t.has(key2) ? t(key2) : message;
  };

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await createOrderAction(locale, values);

      if (!result.ok) {
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
          setError(field as keyof OrderFormValues, { message });
        }
        setFormError(result.error);
        return;
      }

      router.push(`/company/orders/${result.id}`);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {formError && formError !== "validation" ? (
        <Alert tone="critical">{formError}</Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{tf("stepDetails")}</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field
            className="sm:col-span-2"
            label={tf("jobTitle")}
            error={fieldError("title")}
          >
            <Input {...register("title")} placeholder={tf("jobTitlePlaceholder")} />
          </Field>

          <Field label={tf("category")} error={fieldError("category")}>
            <Select {...register("category")}>
              {EQUIPMENT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {t(`equipment.category.${category}`)}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex items-end">
            <label className="flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-[var(--radius-control)] border border-ink-200 px-3">
              <input
                type="checkbox"
                className="size-4 accent-[var(--color-brand-600)]"
                {...register("needsOperator")}
              />
              <span className="text-[13px] font-bold text-ink-900">
                {tf("needsOperator")}
              </span>
            </label>
          </div>

          <Field
            className="sm:col-span-2"
            label={tf("description")}
            hint={tf("needsOperatorHint")}
          >
            <Textarea
              rows={3}
              placeholder={tf("descriptionPlaceholder")}
              {...register("description")}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tf("stepSchedule")}</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label={t("common.from")} error={fieldError("startDate")}>
            <Input type="date" {...register("startDate")} />
          </Field>

          <Field label={t("common.to")} error={fieldError("endDate")}>
            <Input type="date" {...register("endDate")} />
          </Field>

          <Field label={t("owner.form.aimag")} error={fieldError("aimag")}>
            <Select {...register("aimag")}>
              {AIMAGS.map((aimag) => (
                <option key={aimag.name} value={aimag.name}>
                  {locale === "en" ? aimag.nameEn : aimag.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t("owner.form.district")}>
            <Select {...register("district")}>
              <option value="">—</option>
              {districts.map((district) => (
                <option key={district.name} value={district.name}>
                  {locale === "en" ? district.nameEn : district.name}
                </option>
              ))}
            </Select>
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tf("stepBudget")}</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label={`${tf("budgetMin")} (₮)`} error={fieldError("budgetMin")}>
            <Input type="number" className="tabular" {...register("budgetMin")} />
          </Field>
          <Field
            label={`${tf("budgetMax")} (₮)`}
            error={fieldError("budgetMax")}
            hint={tf("budgetHint")}
          >
            <Input type="number" className="tabular" {...register("budgetMax")} />
          </Field>
        </CardBody>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          <Sparkles />
          {tf("submit")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.back()}
        >
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
