import { Logo } from "./logo";
import { LanguageSwitcher } from "./language-switcher";

/**
 * The bar above pages that render outside the dashboard shell — signing in and
 * the legal documents. Shared so those pages agree on their header rather than
 * each growing its own.
 */
export function PublicHeader() {
  return (
    <header className="relative flex h-16 items-center justify-between px-5 sm:px-8">
      <Logo />
      <LanguageSwitcher />
    </header>
  );
}
