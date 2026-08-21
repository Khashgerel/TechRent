import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "brand" | "accent" | "positive" | "neutral";
  className?: string;
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-600",
    accent: "bg-accent-100 text-accent-600",
    positive: "bg-positive-soft text-positive",
    neutral: "bg-ink-100 text-ink-500",
  } as const;

  return (
    <div className={cn("card flex items-start gap-3.5 p-4", className)}>
      {Icon ? (
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)]",
            tones[tone],
          )}
        >
          <Icon className="size-5" />
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-ink-500">{label}</p>
        <p className="mt-0.5 truncate text-[20px] font-extrabold tracking-tight text-ink-900 tabular">
          {value}
        </p>
        {hint ? <p className="mt-0.5 text-[12px] text-ink-400">{hint}</p> : null}
      </div>
    </div>
  );
}
