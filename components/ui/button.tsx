import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800",
        accent:
          "bg-accent-500 text-ink-950 shadow-sm hover:bg-accent-400 active:bg-accent-600",
        outline:
          "border border-ink-200 bg-surface text-ink-700 hover:border-ink-300 hover:bg-ink-50",
        ghost: "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
        danger: "bg-critical text-white shadow-sm hover:brightness-110",
        subtle: "bg-brand-50 text-brand-700 hover:bg-brand-100",
      },
      size: {
        sm: "h-8 px-3 text-[13px] [&_svg]:size-4",
        md: "h-10 px-4 text-sm [&_svg]:size-4",
        lg: "h-12 px-6 text-base [&_svg]:size-5",
        icon: "size-10 [&_svg]:size-4",
      },
      full: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  full,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, full }), className)}
      {...props}
    />
  );
}
