"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LayoutGrid, MapIcon } from "lucide-react";
import { MapPanel, type MapPin } from "@/components/map/map-panel";
import { cn } from "@/lib/utils";

/**
 * Holds the list/map toggle. The list itself is rendered on the server and
 * passed through as children, so switching views costs no extra fetch.
 */
export function ResultsView({
  pins,
  count,
  children,
}: {
  pins: MapPin[];
  count: number;
  children: React.ReactNode;
}) {
  const t = useTranslations("company.search");
  const [view, setView] = useState<"list" | "map">("list");

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-ink-600">
          {t("results", { count })}
        </p>

        <div className="inline-flex rounded-[var(--radius-control)] border border-ink-200 bg-surface p-0.5">
          <ToggleButton
            active={view === "list"}
            onClick={() => setView("list")}
            icon={<LayoutGrid className="size-4" />}
            label={t("listView")}
          />
          <ToggleButton
            active={view === "map"}
            onClick={() => setView("map")}
            icon={<MapIcon className="size-4" />}
            label={t("mapView")}
          />
        </div>
      </div>

      {view === "list" ? (
        children
      ) : (
        <MapPanel
          pins={pins}
          hrefBase="/company/equipment"
          className="h-[70vh] min-h-96 w-full overflow-hidden rounded-[var(--radius-card)] border border-ink-200"
        />
      )}
    </>
  );
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[13px] font-bold transition-colors",
        active
          ? "bg-brand-600 text-white shadow-sm"
          : "text-ink-500 hover:text-ink-900",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
