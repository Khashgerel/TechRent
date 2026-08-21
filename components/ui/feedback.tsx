import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-ink-300 bg-surface-muted px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? <div className="text-ink-400">{icon}</div> : null}
      <div>
        <p className="text-sm font-bold text-ink-800">{title}</p>
        {description ? (
          <p className="mt-1 max-w-sm text-[13px] text-ink-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-ink-200/70", className)}
      {...props}
    />
  );
}

export function Alert({
  tone = "brand",
  title,
  children,
  className,
}: {
  tone?: "brand" | "positive" | "caution" | "critical";
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const tones = {
    brand: "border-brand-200 bg-brand-50 text-brand-900",
    positive: "border-positive/25 bg-positive-soft text-positive",
    caution: "border-caution/25 bg-caution-soft text-caution",
    critical: "border-critical/25 bg-critical-soft text-critical",
  } as const;

  return (
    <div
      className={cn(
        "rounded-[var(--radius-control)] border px-4 py-3 text-[13px]",
        tones[tone],
        className,
      )}
    >
      {title ? <p className="font-bold">{title}</p> : null}
      {children}
    </div>
  );
}
