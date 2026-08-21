import { cn } from "@/lib/utils";

/**
 * TechRent mark: an excavator-boom silhouette cut into a rounded square.
 * Drawn inline so it stays crisp and inherits brand tokens.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--color-brand-600)" />
      <path
        d="M6 23h20"
        stroke="var(--color-accent-400)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M9 19.5 13 10l6 2.5"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="19.5" cy="13" r="2.6" fill="var(--color-accent-400)" />
      <path
        d="M9.5 19.5h4.5"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {showText ? (
        <span className="text-[17px] font-extrabold tracking-tight text-ink-900">
          Тек<span className="text-accent-500">Рент</span>
        </span>
      ) : null}
    </span>
  );
}
