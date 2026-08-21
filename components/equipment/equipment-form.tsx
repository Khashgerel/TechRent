"use client";

import { useState, useTransition } from "react";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { EQUIPMENT_CATEGORIES } from "@/lib/equipment";
import { AIMAGS, districtsOf } from "@/lib/locations";
import {
  equipmentSchema,
  type EquipmentFormValues,
  type EquipmentInput,
} from "@/lib/validation/equipment";
import { saveEquipmentAction } from "@/app/[locale]/(dashboard)/owner/equipment/actions";
import { PhotoUploader } from "./photo-uploader";

const STATUS_OPTIONS = ["ACTIVE", "MAINTENANCE", "INACTIVE"] as const;

export function EquipmentForm({
  equipmentId,
  defaults,
}: {
  equipmentId?: string;
  defaults?: Partial<EquipmentFormValues>;
}) {
  const t = useTranslations();
  const tf = useTranslations("owner.form");
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
  } = useForm<EquipmentFormValues, unknown, EquipmentInput>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      category: "EXCAVATOR",
      make: "",
      model: "",
      year: new Date().getFullYear(),
      hourlyRate: 0,
      dailyRate: 0,
      monthlyRate: 0,
      aimag: "Улаанбаатар",
      district: "",
      description: "",
      withOperator: true,
      status: "ACTIVE",
      photos: [],
      specs: [],
      ...defaults,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "specs" });
  const selectedAimag = useWatch({ control, name: "aimag" });
  const districts = districtsOf(selectedAimag);

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await saveEquipmentAction(locale, equipmentId ?? null, values);

      if (!result.ok) {
        // Server-side validation is authoritative; surface it on the fields.
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
          setError(field as keyof EquipmentFormValues, { message });
        }
        setFormError(result.error);
        return;
      }

      router.push(`/owner/equipment/${result.id}`);
      router.refresh();
    });
  });

  const fieldError = (key: keyof EquipmentFormValues) => {
    const message = errors[key]?.message;
    if (!message) return undefined;
    // Zod messages are keys where we have a translation, plain text otherwise.
    const translationKey = `validation.${message}`;
    const translated = t.has(translationKey) ? t(translationKey) : message;
    return translated;
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {formError && formError !== "validation" ? (
        <Alert tone="critical">{formError}</Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{tf("sectionBasics")}</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label={tf("category")} error={fieldError("category")}>
            <Select {...register("category")}>
              {EQUIPMENT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {t(`equipment.category.${category}`)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={tf("status")} error={fieldError("status")}>
            <Select {...register("status")}>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {t(`equipment.status.${status}`)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={tf("make")} error={fieldError("make")}>
            <Input {...register("make")} placeholder={tf("makePlaceholder")} />
          </Field>

          <Field label={tf("model")} error={fieldError("model")}>
            <Input {...register("model")} placeholder={tf("modelPlaceholder")} />
          </Field>

          <Field label={tf("year")} error={fieldError("year")}>
            <Input
              type="number"
              inputMode="numeric"
              className="tabular"
              {...register("year")}
            />
          </Field>

          <Field className="sm:col-span-2" label={tf("description")}>
            <Textarea
              rows={3}
              placeholder={tf("descriptionPlaceholder")}
              {...register("description")}
            />
          </Field>

          <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border border-ink-200 p-3.5 sm:col-span-2">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--color-brand-600)]"
              {...register("withOperator")}
            />
            <span>
              <span className="block text-[13px] font-bold text-ink-900">
                {tf("withOperator")}
              </span>
              <span className="block text-[12px] text-ink-500">
                {tf("withOperatorHint")}
              </span>
            </span>
          </label>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tf("sectionPricing")}</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Field label={`${tf("hourlyRate")} (₮)`} error={fieldError("hourlyRate")}>
            <Input type="number" className="tabular" {...register("hourlyRate")} />
          </Field>
          <Field label={`${tf("dailyRate")} (₮)`} error={fieldError("dailyRate")}>
            <Input type="number" className="tabular" {...register("dailyRate")} />
          </Field>
          <Field label={`${tf("monthlyRate")} (₮)`} error={fieldError("monthlyRate")}>
            <Input type="number" className="tabular" {...register("monthlyRate")} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tf("sectionLocation")}</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label={tf("aimag")} error={fieldError("aimag")}>
            <Select {...register("aimag")}>
              {AIMAGS.map((aimag) => (
                <option key={aimag.name} value={aimag.name}>
                  {locale === "en" ? aimag.nameEn : aimag.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={tf("district")}>
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
          <CardTitle>{tf("sectionPhotos")}</CardTitle>
        </CardHeader>
        <CardBody>
          <Controller
            control={control}
            name="photos"
            render={({ field }) => (
              <PhotoUploader value={field.value} onChange={field.onChange} />
            )}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tf("sectionSpecs")}</CardTitle>
          <Button
            type="button"
            variant="subtle"
            size="sm"
            onClick={() => append({ name: "", value: "" })}
          >
            <Plus />
            {tf("addSpec")}
          </Button>
        </CardHeader>
        <CardBody className="flex flex-col gap-2.5">
          {fields.length === 0 ? (
            <p className="text-[13px] text-ink-500">{t("common.empty")}</p>
          ) : null}

          {fields.map((spec, index) => (
            <div key={spec.id} className="flex items-center gap-2">
              <Input
                placeholder={tf("specName")}
                {...register(`specs.${index}.name`)}
              />
              <Input
                placeholder={tf("specValue")}
                {...register(`specs.${index}.value`)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                aria-label={t("common.delete")}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </CardBody>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {equipmentId ? tf("update") : tf("create")}
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
