import { cn } from "@/lib/utils";

/** Deterministic colour per name so an avatar stays stable across renders. */
const PALETTE = [
  "bg-brand-600",
  "bg-accent-600",
  "bg-positive",
  "bg-ink-700",
  "bg-brand-800",
  "bg-caution",
];

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const sizes = {
    sm: "size-8 text-[11px]",
    md: "size-9 text-xs",
    lg: "size-14 text-lg",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        PALETTE[hash % PALETTE.length],
        sizes[size],
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
