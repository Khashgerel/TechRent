"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Building2,
  HardHat,
  Lock,
  Shield,
  Truck,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { demoLoginAction, type DemoState } from "@/lib/auth/login-actions";
import type { Role } from "@/lib/generated/prisma/enums";

const ROLE_ICON = {
  OWNER: Truck,
  OPERATOR: HardHat,
  COMPANY: Building2,
  ADMIN: Shield,
} as const;

/** Only what the picker renders — no user rows cross to the client. */
export type Persona = {
  id: string;
  name: string;
  role: Role;
  subtitle: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" full disabled={pending}>
      {label}
      <ArrowRight />
    </Button>
  );
}

export function DemoPicker({
  personas,
  locale,
  gated,
}: {
  personas: Persona[];
  locale: string;
  gated: boolean;
}) {
  const t = useTranslations("demo");
  const tRoles = useTranslations("roles");
  // Tracked by role, not by user id: one account can hold several roles and
  // so can appear on more than one card.
  const [selected, setSelected] = useState<Role | null>(null);
  const [state, formAction] = useActionState<DemoState, FormData>(
    demoLoginAction.bind(null, locale),
    {},
  );

  const active = personas.find((p) => p.role === selected) ?? null;

  return (
    <form action={formAction}>
      <div className="grid gap-3 sm:grid-cols-2">
        {personas.map((persona) => {
          const Icon = ROLE_ICON[persona.role];
          const isActive = persona.role === selected;

          const body = (
            <>
              <Avatar name={persona.name} size="lg" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-600">
                  <Icon className="size-3.5" />
                  {tRoles(persona.role)}
                </span>
                <span className="mt-0.5 block truncate text-[15px] font-bold text-ink-900">
                  {persona.name}
                </span>
                <span className="block truncate text-[12px] text-ink-500">
                  {persona.subtitle}
                </span>
              </span>
              {gated ? (
                <Lock
                  className={`size-4 shrink-0 transition-colors ${
                    isActive ? "text-brand-600" : "text-ink-300"
                  }`}
                />
              ) : (
                <ArrowRight className="size-4 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" />
              )}
            </>
          );

          const className = `card group flex w-full items-center gap-3.5 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[var(--shadow-raised)] ${
            isActive ? "border-brand-500 shadow-[var(--shadow-raised)]" : ""
          }`;

          // Without a gate the card signs straight in, and the button's own
          // name/value carries the persona — no hidden field needed.
          return gated ? (
            <button
              key={persona.role}
              type="button"
              aria-pressed={isActive}
              onClick={() => setSelected(persona.role)}
              className={className}
            >
              {body}
            </button>
          ) : (
            <button
              key={persona.role}
              type="submit"
              name="userId"
              value={persona.id}
              className={className}
            >
              {body}
            </button>
          );
        })}
      </div>

      {gated ? (
        <div className="mt-6">
          {active ? (
            <>
              <input type="hidden" name="userId" value={active.id} />
              <Field
                label={t("passwordLabel")}
                error={state.error ? t(`errors.${state.error}`) : undefined}
              >
                <Input
                  // Remounts per persona so a stale guess never carries over.
                  key={active.role}
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  autoFocus
                  placeholder={t("passwordPlaceholder")}
                />
              </Field>
              <div className="mt-4">
                <SubmitButton label={t("loginAs", { name: active.name })} />
              </div>
            </>
          ) : (
            <p className="text-center text-[13px] font-bold text-ink-500">
              {t("pickRole")}
            </p>
          )}
        </div>
      ) : null}
    </form>
  );
}
