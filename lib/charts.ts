import { shortMonth } from "./dates";

export type RevenuePoint = { key: string; label: string; total: number };

/**
 * Turns the query layer's month buckets into chart points. Lives outside the
 * chart component because that component is client-side and a server page needs
 * to call this while rendering.
 */
export function toRevenuePoints(
  series: { key: string; label: Date; total: number }[],
  locale: string,
): RevenuePoint[] {
  return series.map((m) => ({
    key: m.key,
    label: shortMonth(m.label, locale),
    total: m.total,
  }));
}
