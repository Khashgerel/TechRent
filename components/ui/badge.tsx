import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
  {
    variants: {
      tone: {
        neutral: "bg-ink-100 text-ink-600",
        brand: "bg-brand-50 text-brand-700",
        positive: "bg-positive-soft text-positive",
        caution: "bg-caution-soft text-caution",
        critical: "bg-critical-soft text-critical",
        accent: "bg-accent-100 text-accent-700",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
