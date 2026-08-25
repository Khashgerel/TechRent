import { getTranslations, setRequestLocale } from "next-intl/server";
import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { StoreCatalog } from "@/components/store/store-catalog";
import { StoreFilters } from "@/components/store/store-filters";
import { StoreTabs } from "@/components/store/store-tabs";
import { requireSession } from "@/lib/auth/guards";
import { formatMNT } from "@/lib/money";
import {
  defaultAddressFor,
  getStoreWallet,
  listCartParts,
  listParts,
  type PartFilters,
} from "@/lib/store/queries";
import { PART_CATEGORIES } from "@/lib/store/catalog";
import { EQUIPMENT_CATEGORIES } from "@/lib/equipment";

export default async function StorePage({
  params,
  searchParams,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireSession(locale);
  const t = await getTranslations("store");

  const sp = await searchParams;
  const one = (key: string) => {
    const value = sp[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const category = one("category");
  const fits = one("fits");

  const filters: PartFilters = {
    query: one("q") || undefined,
    // Anything not in the enum is dropped rather than passed to Prisma.
    category: PART_CATEGORIES.find((c) => c === category),
    fits: EQUIPMENT_CATEGORIES.find((c) => c === fits),
    inStockOnly: one("stock") === "1",
    sort: (one("sort") as PartFilters["sort"]) || "relevance",
  };

  const [parts, cartParts, wallet, address] = await Promise.all([
    listParts(filters),
    listCartParts(),
    getStoreWallet(session.uid),
    defaultAddressFor(session.uid),
  ]);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Badge tone="brand" className="h-8 gap-2 px-3 text-[12px]">
            <Wallet className="size-3.5" />
            {formatMNT(wallet.available, locale)}
          </Badge>
        }
      />

      <StoreTabs />
      <StoreFilters />

      <StoreCatalog
        parts={parts}
        cartParts={cartParts}
        balance={wallet.available}
        defaultAddress={address}
      />
    </>
  );
}
