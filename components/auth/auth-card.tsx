import { Logo } from "@/components/shell/logo";
import { LanguageSwitcher } from "@/components/shell/language-switcher";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-canvas bg-grid">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-brand-100/70 to-transparent" />

      <header className="relative flex h-16 items-center justify-between px-5 sm:px-8">
        <Logo />
        <LanguageSwitcher />
      </header>

      <main className="relative flex flex-1 items-center justify-center px-5 pb-16">
        {children}
      </main>
    </div>
  );
}

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-[400px]">
      <div className="card p-7 shadow-[var(--shadow-raised)]">
        <h1 className="text-xl font-extrabold tracking-tight text-ink-900">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
            {description}
          </p>
        ) : null}
        <div className="mt-6">{children}</div>
      </div>
      {footer ? <div className="mt-4 text-center">{footer}</div> : null}
    </div>
  );
}
