"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { formatRange } from "@/lib/dates";
import {
  addAvailabilityBlockAction,
  removeAvailabilityBlockAction,
} from "@/app/[locale]/(dashboard)/owner/equipment/actions";

type Equipment = { id: string; make: string; model: string };

type Block = {
  id: string;
  equipmentId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function BlockManager({
  equipment,
  blocks,
}: {
  equipment: Equipment[];
  blocks: Block[];
}) {
  const t = useTranslations("owner.calendar");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    equipmentId: equipment[0]?.id ?? "",
    startDate: today(),
    endDate: today(),
    reason: "",
  });

  const nameOf = (id: string) => {
    const item = equipment.find((e) => e.id === id);
    return item ? `${item.make} ${item.model}` : "";
  };

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await addAvailabilityBlockAction(locale, form);
      if (!result.ok) {
        const first = Object.values(result.fieldErrors ?? {})[0];
        setError(first ?? result.error);
        return;
      }
      setForm((f) => ({ ...f, reason: "" }));
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("addBlock")}</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        {error ? (
          <Alert tone="critical">
            {error === "endBeforeStart" ? tv("endBeforeStart") : tv("invalid")}
          </Alert>
        ) : null}

        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Field className="sm:col-span-2" label={t("equipment")}>
            <Select
              value={form.equipmentId}
              onChange={(e) => setForm({ ...form, equipmentId: e.target.value })}
            >
              {equipment.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.make} {item.model}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={tc("from")}>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </Field>

          <Field label={tc("to")}>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </Field>

          <Field className="sm:col-span-2" label={t("blockReason")}>
            <Input
              value={form.reason}
              placeholder={t("blockReasonPlaceholder")}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </Field>

          <Button
            type="submit"
            disabled={pending || !form.equipmentId}
            className="sm:col-span-2"
          >
            <Plus />
            {t("addBlock")}
          </Button>
        </form>

        <div className="border-t border-ink-200/70 pt-3">
          {blocks.length === 0 ? (
            <p className="flex items-center gap-2 text-[13px] text-ink-500">
              <CalendarOff className="size-4 text-ink-400" />
              {t("noBlocks")}
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {blocks.map((block) => (
                <li
                  key={block.id}
                  className="flex items-center gap-3 rounded-[var(--radius-control)] bg-surface-muted px-3 py-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold text-ink-800">
                      {nameOf(block.equipmentId)}
                    </span>
                    <span className="block text-[12px] text-ink-500">
                      {formatRange(
                        new Date(block.startDate),
                        new Date(block.endDate),
                        locale,
                      )}
                      {block.reason ? ` · ${block.reason}` : ""}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    aria-label={t("removeBlock")}
                    onClick={() =>
                      startTransition(async () => {
                        await removeAvailabilityBlockAction(locale, block.id);
                        router.refresh();
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
