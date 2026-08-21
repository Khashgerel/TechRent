import { SEQUENTIAL } from "@/lib/chart-palette";
import { cn } from "@/lib/utils";

export type BarRow = {
  id: string;
  name: string;
  /** Bar length as a share of the row's track, 0–100. */
  fill: number;
  /** What the number actually means — always shown, never inferred from the bar. */
  label: string;
};

/**
 * Magnitude across a short named list: one horizontal bar per row, single hue,
 * stepped darker as the value rises. Every row carries its own direct label, so
 * the chart needs neither a legend nor a hover layer to be readable.
 */
export function MagnitudeBars({
  rows,
  className,
}: {
  rows: BarRow[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-col gap-3", className)}>
      {rows.map((row) => {
        const step =
          SEQUENTIAL[
            Math.min(
              SEQUENTIAL.length - 1,
              Math.floor((row.fill / 100) * SEQUENTIAL.length),
            )
          ];

        return (
          <li key={row.id} className="flex items-center gap-3">
            <span className="w-40 shrink-0 truncate text-[13px] font-semibold text-ink-700">
              {row.name}
            </span>
            <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100">
              <span
                className="absolute inset-y-0 left-0 rounded-full transition-all"
                style={{
                  width: `${Math.max(row.fill, 2)}%`,
                  backgroundColor: step,
                }}
              />
            </span>
            <span className="shrink-0 text-right text-[13px] font-bold text-ink-900 tabular">
              {row.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
