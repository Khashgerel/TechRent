/**
 * Money across TechRent is whole Mongolian tugrik (MNT) held in integers.
 * Nothing in this market is priced in fractions of a tugrik, so integers keep
 * the ledger exact and free of floating-point drift.
 */

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(locale: string) {
  let f = formatters.get(locale);
  if (!f) {
    f = new Intl.NumberFormat(locale === "mn" ? "mn-MN" : "en-US", {
      maximumFractionDigits: 0,
    });
    formatters.set(locale, f);
  }
  return f;
}

/** "5,000,000₮" */
export function formatMNT(amount: number, locale = "mn") {
  return `${formatter(locale).format(Math.round(amount))}₮`;
}

/** "5.0 сая₮" — compact form for dashboard tiles where space is tight. */
export function formatMNTCompact(amount: number, locale = "mn") {
  const abs = Math.abs(amount);
  const suffix = locale === "mn" ? { m: " сая₮", k: " мянга₮" } : { m: "M₮", k: "K₮" };
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}${suffix.m}`;
  if (abs >= 1_000) return `${(amount / 1_000).toFixed(0)}${suffix.k}`;
  return `${amount}₮`;
}

/** Splits a gross booking amount into commission, owner payout and operator payout. */
export function splitBookingAmount(
  total: number,
  commissionRate: number,
  operatorShare: number,
  hasOperator: boolean,
) {
  const commissionAmount = Math.round(total * commissionRate);
  const net = total - commissionAmount;
  const operatorPayout = hasOperator ? Math.round(net * operatorShare) : 0;
  const ownerPayout = net - operatorPayout;
  return { commissionAmount, ownerPayout, operatorPayout };
}
