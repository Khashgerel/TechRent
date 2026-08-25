"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/feedback";
import type { MapPin } from "./equipment-map";

/**
 * Leaflet reaches for `window` at import time, so the map is only ever loaded
 * in the browser.
 */
const EquipmentMap = dynamic(() => import("./equipment-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-[var(--radius-card)]" />,
});

export function MapPanel({
  pins,
  hrefBase,
  className,
}: {
  pins: MapPin[];
  /** Pin links resolve to `${hrefBase}/${id}` — a prefix, because functions
   * cannot cross the server/client boundary. */
  hrefBase: string;
  className?: string;
}) {
  return <EquipmentMap pins={pins} hrefBase={hrefBase} className={className} />;
}

export type { MapPin };
