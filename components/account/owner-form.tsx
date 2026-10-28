"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { AIMAGS, districtsOf } from "@/lib/locations";
import {
  ownerProfileSchema,
  type OwnerProfileInput,
  type OwnerProfileValues,
} from "@/lib/validation/profile";
import { becomeOwnerAction } from "@/lib/account/role-actions";

export function OwnerForm({ defaults }: { defaults?: Partial<OwnerProfileValues> }) {
  const t = useTranslations("account.owner");
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
  } = useForm<OwnerProfileValues, unknown, OwnerProfileInput>({
    resolver: zodResolver(ownerProfileSchema),
    defaultValues: {
      companyName: "",
      regNumber: "",
      aimag: "Улаанбаатар",
      district: "",
      bio: "",
      ...defaults,
    },
  });

  const aimag = useWatch({ control, name: "aimag" });
  const districts = districtsOf(aimag ?? "");
  const err = (key: keyof OwnerProfileValues) =>
    errors[key] ? tv(errors[key]?.message ?? "invalid") : undefined;

  const onSubmit = (values: OwnerProfileInput) => {
    setFormError(null);
    startTransition(async () => {
      const result = await becomeOwnerAction(locale, values);
      if (!result.ok) {
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
          setError(field as keyof OwnerProfileValues, { message });
        }
        if (!result.fieldErrors) setFormError(result.error);
        return;
      }
      router.push("/owner");
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

          <Field label={t("companyName")} error={err("companyName")}>
            <Input {...register("companyName")} autoFocus />
          </Field>

          <Field label={t("regNumber")}>
            <Input {...register("regNumber")} inputMode="numeric" />
          </Field>

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

          <Button type="submit" size="lg" disabled={pending}>
            {t("submit")}
            <ArrowRight />
          </Button>
        </CardBody>
      </Card>
    </form>
  );
}
