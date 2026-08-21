"use client";

import { useLocale } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_INK, SERIES } from "@/lib/chart-palette";
import { formatMNT, formatMNTCompact } from "@/lib/money";

import type { RevenuePoint } from "@/lib/charts";

/**
 * One series, one axis. The title names the series, so there is no legend —
 * a legend box for a single series is noise.
 */
export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const locale = useLocale();

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid
            vertical={false}
            stroke={CHART_INK.grid}
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: CHART_INK.label, fontSize: 12, fontWeight: 600 }}
            dy={6}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tick={{ fill: CHART_INK.label, fontSize: 11 }}
            tickFormatter={(value: number) => formatMNTCompact(value, locale)}
          />
          <Tooltip
            cursor={{ fill: "rgb(15 23 42 / 0.04)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-[var(--radius-control)] border border-ink-200 bg-surface px-3 py-2 shadow-[var(--shadow-raised)]">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">
                    {label}
                  </p>
                  <p className="mt-0.5 text-sm font-extrabold text-ink-900 tabular">
                    {formatMNT(Number(payload[0].value ?? 0), locale)}
                  </p>
                </div>
              );
            }}
          />
          <Bar
            dataKey="total"
            fill={SERIES[0]}
            radius={[4, 4, 0, 0]}
            maxBarSize={44}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
