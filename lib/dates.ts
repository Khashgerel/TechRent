const MONTHS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "3-р сар" / "Mar" — Mongolian names months by number, so don't use Intl here. */
export function shortMonth(date: Date, locale: string) {
  return locale === "mn"
    ? `${date.getMonth() + 1}-р сар`
    : MONTHS_EN[date.getMonth()];
}

/** Sunday-first, matching Date.getDay(). */
const WEEKDAYS_MN = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];
const WEEKDAYS_EN = ["S", "M", "T", "W", "T", "F", "S"];

/** ICU has no usable narrow weekday for mn-MN, so both locales use a table. */
export function weekdayNarrow(date: Date, locale: string) {
  return locale === "mn"
    ? WEEKDAYS_MN[date.getDay()]
    : WEEKDAYS_EN[date.getDay()];
}

export function formatDate(date: Date, locale: string) {
  return locale === "mn"
    ? `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
    : `${date.getDate()} ${MONTHS_EN[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateShort(date: Date, locale: string) {
  return locale === "mn"
    ? `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
    : `${date.getDate()} ${MONTHS_EN[date.getMonth()]}`;
}

/**
 * Ranges drop whatever the two ends share, so the year (and month, when it
 * matches) is stated once instead of twice.
 */
export function formatRange(start: Date, end: Date, locale: string) {
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (locale === "mn") {
    const y = start.getFullYear();
    const m = (d: Date) => String(d.getMonth() + 1).padStart(2, "0");
    const d = (x: Date) => String(x.getDate()).padStart(2, "0");

    if (sameMonth) return `${y}.${m(start)}.${d(start)}–${d(end)}`;
    if (sameYear) return `${y}.${m(start)}.${d(start)} – ${m(end)}.${d(end)}`;
    return `${formatDate(start, locale)} – ${formatDate(end, locale)}`;
  }

  // Deliberately not Intl: ICU abbreviates September as "Sept", which breaks
  // the uniform three-letter rhythm across a column of dates.
  const month = (date: Date) => MONTHS_EN[date.getMonth()];

  if (sameMonth) {
    return `${start.getDate()}–${end.getDate()} ${month(end)} ${end.getFullYear()}`;
  }
  if (sameYear) {
    return `${start.getDate()} ${month(start)} – ${end.getDate()} ${month(end)} ${end.getFullYear()}`;
  }
  return `${formatDate(start, locale)} – ${formatDate(end, locale)}`;
}

export function daysBetween(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
