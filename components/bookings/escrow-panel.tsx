import { useLocale, useTranslations } from "next-intl";
import { Lock, ShieldCheck, Undo2 } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { heldAmount } from "@/lib/escrow/booking";
import { formatMNT } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/lib/generated/prisma/enums";

/**
 * Shows exactly where the client's money is: still with them, held by the
 * platform, or split out to the parties. This is the escrow claim made legible.
 */
export function EscrowPanel({
  status,
  totalAmount,
  depositAmount,
  commissionAmount,
  ownerPayout,
  operatorPayout,
  hasOperator,
}: {
  status: BookingStatus;
  totalAmount: number;
  depositAmount: number;
  commissionAmount: number;
  ownerPayout: number;
  operatorPayout: number;
  hasOperator: boolean;
}) {
  const t = useTranslations("booking.escrow");
  const locale = useLocale();

  const held = heldAmount(status, {
    totalAmount,
    depositAmount,
    commissionAmount,
    ownerPayout,
    operatorPayout,
  });

  const settled = status === "PAID";
  const cancelled = status === "CANCELLED";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-[var(--radius-control)] px-3.5 py-3",
            settled && "bg-positive-soft",
            cancelled && "bg-ink-100",
            !settled && !cancelled && "bg-accent-100",
          )}
        >
          {settled ? (
            <ShieldCheck className="size-5 shrink-0 text-positive" />
          ) : cancelled ? (
            <Undo2 className="size-5 shrink-0 text-ink-500" />
          ) : (
            <Lock className="size-5 shrink-0 text-accent-600" />
          )}

          <div>
            <p
              className={cn(
                "text-[12px] font-bold",
                settled ? "text-positive" : cancelled ? "text-ink-600" : "text-accent-700",
              )}
            >
              {settled ? t("released") : cancelled ? t("refunded") : t("held")}
            </p>
            <p className="text-[17px] font-extrabold text-ink-900 tabular">
              {formatMNT(settled ? totalAmount : held, locale)}
            </p>
          </div>
        </div>

        <dl className="flex flex-col gap-2 border-t border-ink-200/70 pt-3">
          <Row label={t("total")} value={formatMNT(totalAmount, locale)} emphasis />
          <Row label={t("deposit")} value={formatMNT(depositAmount, locale)} />
          <Row
            label={t("balance")}
            value={formatMNT(totalAmount - depositAmount, locale)}
          />
        </dl>

        <dl className="flex flex-col gap-2 border-t border-ink-200/70 pt-3">
          <Row label={t("ownerPayout")} value={formatMNT(ownerPayout, locale)} />
          {hasOperator ? (
            <Row
              label={t("operatorPayout")}
              value={formatMNT(operatorPayout, locale)}
            />
          ) : null}
          <Row label={t("commission")} value={formatMNT(commissionAmount, locale)} />
        </dl>
      </CardBody>
    </Card>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[13px] text-ink-500">{label}</dt>
      <dd
        className={cn(
          "tabular",
          emphasis
            ? "text-[15px] font-extrabold text-ink-900"
            : "text-[13px] font-bold text-ink-800",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
