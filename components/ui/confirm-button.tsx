"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Two-step destructive action: the first click swaps the button for an explicit
 * confirm/cancel pair, so nothing irreversible happens on a single stray click.
 */
export function ConfirmButton({
  action,
  label,
  confirmLabel,
  question,
  icon,
  variant = "ghost",
  size = "sm",
  className,
}: {
  action: () => Promise<void>;
  label: string;
  confirmLabel?: string;
  question?: string;
  icon?: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const t = useTranslations("common");
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!armed) {
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setArmed(true)}
      >
        {icon}
        {label}
      </Button>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {question ? (
        <span className="text-[12px] font-semibold text-ink-600">{question}</span>
      ) : null}
      <Button
        type="button"
        variant="danger"
        size={size}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await action();
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" /> : null}
        {confirmLabel ?? t("confirm")}
      </Button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className={cn(buttonVariants({ variant: "ghost", size }))}
      >
        {t("cancel")}
      </button>
    </span>
  );
}
