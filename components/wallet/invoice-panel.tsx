"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, ExternalLink, Loader2, RefreshCw, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { formatMNT } from "@/lib/money";
import {
  cancelTopupAction,
  checkTopupAction,
} from "@/app/[locale]/(dashboard)/wallet/actions";

export type InvoicePanelData = {
  id: string;
  amount: number;
  senderInvoiceNo: string;
  qrImage: string | null;
  qrText: string | null;
  shortUrl: string | null;
  deeplinks: { name: string; description: string; logo: string; link: string }[];
};

/**
 * The invoice QPay handed back: a QR to scan, a short link to send, and the
 * bank apps that can open it directly.
 *
 * Checking is a button rather than a timer. QPay's documentation forbids
 * polling, and on localhost the callback cannot reach the app anyway — so the
 * press is both the supported path and the one that works while developing.
 */
export function InvoicePanel({ invoice }: { invoice: InvoicePanelData }) {
  const t = useTranslations("wallet");
  const locale = useLocale();
  const router = useRouter();

  const [checking, startCheck] = useTransition();
  const [cancelling, startCancel] = useTransition();
  const [state, setState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = () => {
    setError(null);
    setState(null);
    startCheck(async () => {
      const result = await checkTopupAction(locale, invoice.id);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setState(result.state);
      router.refresh();
    });
  };

  const message = (key: string, namespace: "errors" | "states") =>
    t.has(`${namespace}.${key}`)
      ? t(`${namespace}.${key}`)
      : t("errors.generic");

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>{t("pendingTitle")}</CardTitle>
          <p className="mt-0.5 text-[12px] text-ink-500 tabular">
            {invoice.senderInvoiceNo}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Badge tone="caution">{t("states.unpaid")}</Badge>
          <span className="text-[16px] font-extrabold text-ink-900 tabular">
            {formatMNT(invoice.amount, locale)}
          </span>
        </div>
      </CardHeader>

      <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-start">
        {invoice.qrImage ? (
          <div className="shrink-0">
            {/* QPay returns the QR as base64 PNG, so there is no URL for
                next/image to optimise. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${invoice.qrImage}`}
              alt={t("qrAlt")}
              className="size-44 rounded-[var(--radius-control)] border border-ink-200 bg-white p-2"
            />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <p className="text-[13px] leading-relaxed text-ink-600">
            {t("pendingHint")}
          </p>

          {invoice.shortUrl ? (
            <a
              href={invoice.shortUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-1.5 text-[13px] font-bold text-brand-600 hover:underline"
            >
              <ExternalLink className="size-3.5" />
              {invoice.shortUrl}
            </a>
          ) : null}

          {invoice.deeplinks.length ? (
            <div>
              <p className="mb-2 text-[12px] font-semibold text-ink-500">
                {t("banksLabel")}
              </p>
              <div className="flex flex-wrap gap-2">
                {invoice.deeplinks.slice(0, 12).map((bank) => (
                  <a
                    key={bank.name}
                    href={bank.link}
                    className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-ink-200 px-2.5 py-1.5 text-[12px] font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
                  >
                    {/* Bank logos are hosted by QPay; plain img keeps the
                        remote-image config out of this. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={bank.logo} alt="" className="size-4 rounded" />
                    {bank.description || bank.name}
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {state ? (
            <Alert tone={state === "paid" ? "positive" : "brand"}>
              {message(state, "states")}
            </Alert>
          ) : null}

          {error ? <Alert tone="critical">{message(error, "errors")}</Alert> : null}

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Button type="button" disabled={checking} onClick={check}>
              {checking ? (
                <Loader2 className="animate-spin" />
              ) : state === "paid" ? (
                <Check />
              ) : (
                <RefreshCw />
              )}
              {t("checkPayment")}
            </Button>

            <Button
              type="button"
              variant="ghost"
              disabled={cancelling}
              onClick={() =>
                startCancel(async () => {
                  await cancelTopupAction(locale, invoice.id);
                  router.refresh();
                })
              }
            >
              {cancelling ? <Loader2 className="animate-spin" /> : <X />}
              {t("cancelInvoice")}
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
