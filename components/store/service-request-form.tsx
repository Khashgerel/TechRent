"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Wrench } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { EQUIPMENT_CATEGORIES } from "@/lib/equipment";
import {
  serviceRequestSchema,
  type ServiceRequestFormValues,
  type ServiceRequestInput,
} from "@/lib/validation/store";
import { createServiceRequestAction } from "@/app/[locale]/(dashboard)/store/actions";
import type { EquipmentCategory } from "@/lib/generated/prisma/enums";

export type ServiceEquipmentOption = {
  id: string;
  make: string;
  model: string;
  category: EquipmentCategory;
};

export function ServiceRequestForm({
  equipment,
}: {
  equipment: ServiceEquipmentOption[];
}) {
  const t = useTranslations("store");
  const tt = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ServiceRequestFormValues, unknown, ServiceRequestInput>({
    resolver: zodResolver(serviceRequestSchema),
    defaultValues: {
      category: equipment[0]?.category ?? "EXCAVATOR",
      equipmentId: "",
      description: "",
      preferredAt: "",
    },
  });

  const fieldError = (key: keyof ServiceRequestFormValues) => {
    const message = errors[key]?.message;
    if (!message) return undefined;
    const key2 = `validation.${message}`;
    return tt.has(key2) ? tt(key2) : message;
  };

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    setDone(false);

    startTransition(async () => {
      const result = await createServiceRequestAction(locale, values);

      if (!result.ok) {
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
          setError(field as keyof ServiceRequestFormValues, { message });
        }
        setFormError(result.error);
        return;
      }

      reset({
        category: values.category as EquipmentCategory,
        equipmentId: "",
        description: "",
        preferredAt: "",
      });
      setDone(true);
      router.refresh();
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("serviceFormTitle")}</CardTitle>
      </CardHeader>

      <CardBody>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <p className="text-[13px] text-ink-500">{t("serviceFormHint")}</p>

          {done ? <Alert tone="positive">{t("serviceSubmitted")}</Alert> : null}
          {formError && formError !== "validation" ? (
            <Alert tone="critical">{t("errors.generic")}</Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("serviceCategory")} error={fieldError("category")}>
              <Select {...register("category")}>
                {EQUIPMENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {tt(`equipment.category.${category}`)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t("servicePreferredAt")} error={fieldError("preferredAt")}>
              <Input type="date" {...register("preferredAt")} />
            </Field>

            {equipment.length ? (
              <Field
                className="sm:col-span-2"
                label={t("serviceEquipment")}
                error={fieldError("equipmentId")}
              >
                <Select {...register("equipmentId")}>
                  <option value="">{t("serviceNoEquipment")}</option>
                  {equipment.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.make} {item.model}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
          </div>

          <Field label={t("serviceDescription")} error={fieldError("description")}>
            <Textarea
              rows={4}
              placeholder={t("serviceDescriptionPlaceholder")}
              {...register("description")}
            />
          </Field>

          <div>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Wrench />}
              {t("serviceSubmit")}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
