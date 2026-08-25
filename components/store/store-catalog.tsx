"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, PackageSearch, ShoppingCart, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Field, Input, Textarea } from "@/components/ui/field";
import { PartCard, type PartCardData } from "@/components/store/part-card";
import { formatMNT } from "@/lib/money";
import { MAX_CART_LINES, MAX_LINE_QUANTITY, partName } from "@/lib/store/catalog";
import {
  clearCart,
  getCart,
  getServerCart,
  setQuantity as setCartQuantity,
  subscribe,
} from "@/components/store/cart-store";
import { checkoutAction } from "@/app/[locale]/(dashboard)/store/actions";
import type { CartPart } from "@/lib/store/queries";

/**
 * The catalogue and the cart are one component because the cart is the only
 * client state on the page — filters are in the URL and prices come from the
 * server. It survives a reload in `localStorage`, and is re-priced server-side
 * at checkout, so nothing here is trusted for money.
 */
export function StoreCatalog({
  parts,
  cartParts,
  balance,
  defaultAddress,
}: {
  /** The filtered catalogue shown as cards. */
  parts: PartCardData[];
  /** Every sellable part, so a filtered-out basket line still prices. */
  cartParts: CartPart[];
  balance: number;
  defaultAddress: string;
}) {
  const t = useTranslations("store");
  const tc = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  const cart = useSyncExternalStore(subscribe, getCart, getServerCart);
  const [address, setAddress] = useState(defaultAddress);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const byId = useMemo(
    () => new Map(cartParts.map((part) => [part.id, part])),
    [cartParts],
  );

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .map(([partId, quantity]) => {
          const part = byId.get(partId);
          return part ? { part, quantity, lineTotal: part.price * quantity } : null;
        })
        .filter((line): line is NonNullable<typeof line> => line !== null),
    [cart, byId],
  );

  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);

  function setQuantity(partId: string, quantity: number) {
    setError(null);
    // Never let a line exceed what the last server render said was in stock.
    setCartQuantity(partId, quantity, byId.get(partId)?.stock ?? MAX_LINE_QUANTITY);
  }

  function add(partId: string) {
    if (!cart[partId] && Object.keys(cart).length >= MAX_CART_LINES) {
      setError("tooManyLines");
      return;
    }
    setQuantity(partId, (cart[partId] ?? 0) + 1);
  }

  const onCheckout = () => {
    setError(null);
    startTransition(async () => {
      const result = await checkoutAction(locale, {
        items: lines.map((line) => ({
          partId: line.part.id,
          quantity: line.quantity,
        })),
        address,
        note,
      });

      if (!result.ok) {
        setError(result.error);
        // Stock moved under us: drop back to what is actually available.
        for (const problem of result.problems ?? []) {
          setQuantity(problem.partId, problem.available);
        }
        router.refresh();
        return;
      }

      clearCart();
      router.push("/store/orders");
      router.refresh();
    });
  };

  const addressTooShort = address.trim().length < 5;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {parts.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {parts.map((part) => (
              <PartCard
                key={part.id}
                part={part}
                quantity={cart[part.id] ?? 0}
                onAdd={add}
                onSetQuantity={setQuantity}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<PackageSearch className="size-8" />}
            title={t("noParts")}
            description={t("noPartsHint")}
          />
        )}
      </div>

      <div className="lg:col-span-1">
        <Card className="lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle>{t("cart")}</CardTitle>
            <span className="text-[12px] font-semibold text-ink-500">
              {t("itemCount", { count: lines.length })}
            </span>
          </CardHeader>

          {lines.length === 0 ? (
            <CardBody>
              <p className="text-[13px] text-ink-500">{t("cartEmpty")}</p>
            </CardBody>
          ) : (
            <>
              <div className="divide-y divide-ink-200/70">
                {lines.map((line) => (
                  <div key={line.part.id} className="flex items-start gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-ink-900">
                        {partName(line.part, locale)}
                      </p>
                      <p className="text-[12px] text-ink-500 tabular">
                        {line.quantity} × {formatMNT(line.part.price, locale)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[13px] font-extrabold text-ink-900 tabular">
                      {formatMNT(line.lineTotal, locale)}
                    </span>
                    <button
                      type="button"
                      aria-label={tc("common.delete")}
                      onClick={() => setQuantity(line.part.id, 0)}
                      className="shrink-0 rounded p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-critical"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>

              <CardBody className="flex flex-col gap-3 border-t border-ink-200/70">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-ink-600">
                    {t("total")}
                  </span>
                  <span className="text-[18px] font-extrabold tracking-tight text-ink-900 tabular">
                    {formatMNT(total, locale)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[12px] text-ink-500">
                  <span>{t("walletBalance")}</span>
                  <span className="font-semibold tabular">
                    {formatMNT(balance, locale)}
                  </span>
                </div>

                {total > balance ? (
                  <Alert tone="brand">{t("topUpNotice")}</Alert>
                ) : null}

                <Field label={t("deliveryAddress")}>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t("addressPlaceholder")}
                  />
                </Field>

                <Field label={t("noteLabel")}>
                  <Textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t("notePlaceholder")}
                  />
                </Field>

                {error ? (
                  <Alert tone="critical">
                    {tc.has(`store.errors.${error}`)
                      ? t(`errors.${error}`)
                      : t("errors.generic")}
                  </Alert>
                ) : null}

                <Button
                  type="button"
                  full
                  disabled={pending || addressTooShort}
                  onClick={onCheckout}
                >
                  {pending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <ShoppingCart />
                  )}
                  {t("checkout")}
                </Button>
              </CardBody>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
