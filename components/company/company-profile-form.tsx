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
import { Field, Input, Select } from "@/components/ui/field";
import { AIMAGS, districtsOf } from "@/lib/locations";
import {
  companyProfileSchema,
  type CompanyProfileInput,
  type CompanyProfileValues,
} from "@/lib/validation/profile";
import { saveCompanyProfileAction } from "@/lib/company/profile-actions";

export function CompanyProfileForm({
  defaults,
  next,
}: {
  defaults?: Partial<CompanyProfileValues>;
  /** Where to continue once the details are on file. */
  next?: string;
}) {
  const t = useTranslations("company.profile");
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
  } = useForm<CompanyProfileValues, unknown, CompanyProfileInput>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      companyName: "",
      regNumber: "",
      industry: "",
      aimag: "Улаанбаатар",
      district: "",
      contactName: "",
      phone: "",
      ...defaults,
    },
  });

  const aimag = useWatch({ control, name: "aimag" });
  const districts = districtsOf(aimag ?? "");

  const onSubmit = (values: CompanyProfileInput) => {
    setFormError(null);
    startTransition(async () => {
      const result = await saveCompanyProfileAction(locale, values);

      if (!result.ok) {
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            setError(field as keyof CompanyProfileValues, { message });
          }
        }
        if (!result.fieldErrors) setFormError(result.error);
        return;
      }

      router.push(next ? `/${next}` : "/company");
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

          <Field
            label={t("companyName")}
            error={errors.companyName ? tv(errors.companyName.message ?? "invalid") : undefined}
          >
            <Input {...register("companyName")} autoFocus />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t("regNumber")}>
              <Input {...register("regNumber")} inputMode="numeric" />
            </Field>
            <Field label={t("industry")}>
              <Input {...register("industry")} />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label={t("aimag")}
              error={errors.aimag ? tv(errors.aimag.message ?? "invalid") : undefined}
            >
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

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label={t("contactName")}
              error={errors.contactName ? tv(errors.contactName.message ?? "invalid") : undefined}
            >
              <Input {...register("contactName")} autoComplete="name" />
            </Field>

            <Field
              label={t("phone")}
              error={errors.phone ? tv(errors.phone.message ?? "invalid") : undefined}
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex h-10 shrink-0 items-center rounded-[var(--radius-control)] border border-ink-200 bg-ink-50 px-3 text-sm font-bold text-ink-500">
                  +976
                </span>
                <Input
                  {...register("phone")}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="9911 2233"
                  className="tabular"
                />
              </div>
            </Field>
          </div>

          <Button type="submit" size="lg" disabled={pending}>
            {t("save")}
            <ArrowRight />
          </Button>
        </CardBody>
      </Card>
    </form>
  );
}
