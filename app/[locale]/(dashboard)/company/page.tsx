import { getTranslations, setRequestLocale } from "next-intl/server";
import { SearchX } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { EquipmentCard } from "@/components/equipment/equipment-card";
import { SearchFilters } from "@/components/company/search-filters";
import { ResultsView } from "@/components/company/results-view";
import { requireRole } from "@/lib/auth/guards";
import { searchEquipment, type SearchFilters as Filters } from "@/lib/company/queries";

function parseDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseNumber(value: string | undefined) {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export default async function CompanySearchPage({
  params,
  searchParams,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireRole(locale, "COMPANY");

  const t = await getTranslations();
  const sp = await searchParams;
  const one = (key: string) => {
    const value = sp[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const filters: Filters = {
    query: one("q") || undefined,
    category: one("category") || undefined,
    aimag: one("aimag") || undefined,
    withOperator: one("operator") === "1",
    minRate: parseNumber(one("minRate")),
    maxRate: parseNumber(one("maxRate")),
    startDate: parseDate(one("start")),
    endDate: parseDate(one("end")),
    sort: (one("sort") as Filters["sort"]) || "relevance",
  };

  const results = await searchEquipment(filters);

  const pins = results.map((item) => ({
    id: item.id,
    lat: item.lat,
    lng: item.lng,
    category: item.category,
    make: item.make,
    model: item.model,
    dailyRate: item.dailyRate,
    aimag: item.aimag,
    district: item.district,
    ratingAvg: item.ratingAvg,
    ratingCount: item.ratingCount,
  }));

  return (
    <>
      <PageHeader
        title={t("company.search.title")}
        description={t("company.search.subtitle")}
        actions={
          <Link href="/company/orders/new" className={buttonVariants()}>
            {t("company.orders.create")}
          </Link>
        }
      />

      <SearchFilters />

      {results.length ? (
        <ResultsView pins={pins} count={results.length}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((item) => (
              <EquipmentCard
                key={item.id}
                equipment={item}
                href={`/company/equipment/${item.id}`}
              />
            ))}
          </div>
        </ResultsView>
      ) : (
        <EmptyState
          icon={<SearchX className="size-8" />}
          title={t("company.search.noResults")}
          description={t("company.search.noResultsHint")}
        />
      )}
    </>
  );
}
