"use client";

import { useEffect, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "@/i18n/navigation";
import { CATEGORY_GRADIENT } from "@/lib/equipment";
import { MONGOLIA_CENTER } from "@/lib/geo";
import { formatPlace } from "@/lib/locations";
import { formatMNTCompact } from "@/lib/money";
import type { EquipmentCategory } from "@/lib/generated/prisma/enums";

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  category: EquipmentCategory;
  make: string;
  model: string;
  dailyRate: number;
  aimag: string;
  district: string | null;
  ratingAvg: number;
  ratingCount: number;
};

/**
 * Leaflet's bundled marker images break under bundlers because they're
 * referenced by relative URL. A divIcon sidesteps that entirely and lets each
 * pin carry its category colour and price, which is the information a client
 * scanning the map actually wants.
 */
function pinIcon(category: EquipmentCategory, label: string) {
  const [from, to] = CATEGORY_GRADIENT[category];

  return L.divIcon({
    className: "",
    html: `
      <div style="transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;">
        <div style="
          background:linear-gradient(135deg,${from},${to});
          color:#fff;font:700 11px/1 Manrope,sans-serif;
          padding:5px 8px;border-radius:999px;white-space:nowrap;
          box-shadow:0 2px 6px rgb(15 23 42 / .35);
          border:1.5px solid #fff;">${label}</div>
        <div style="
          width:0;height:0;margin-top:-1px;
          border-left:5px solid transparent;border-right:5px solid transparent;
          border-top:7px solid ${to};"></div>
      </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/** Keeps every pin in view whenever the result set changes. */
function FitBounds({ pins }: { pins: MapPin[] }) {
  const map = useMap();

  useEffect(() => {
    if (pins.length === 0) return;

    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 11);
      return;
    }

    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 });
  }, [pins, map]);

  return null;
}

export default function EquipmentMap({
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
  const t = useTranslations();
  const locale = useLocale();

  const markers = useMemo(
    () =>
      pins.map((pin) => ({
        pin,
        icon: pinIcon(pin.category, formatMNTCompact(pin.dailyRate, locale)),
      })),
    [pins, locale],
  );

  return (
    <div className={className}>
      <MapContainer
        center={[MONGOLIA_CENTER.lat, MONGOLIA_CENTER.lng]}
        zoom={5}
        scrollWheelZoom
        className="size-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds pins={pins} />

        {markers.map(({ pin, icon }) => (
          <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={icon}>
            <Popup>
              <div className="min-w-44">
                <p className="text-[11px] font-bold uppercase tracking-wide text-brand-600">
                  {t(`equipment.category.${pin.category}`)}
                </p>
                <p className="mt-0.5 text-[14px] font-bold text-ink-900">
                  {pin.make} {pin.model}
                </p>
                <p className="text-[12px] text-ink-500">
                  {formatPlace(pin.aimag, pin.district, locale)}
                </p>
                <p className="mt-1 text-[13px] font-extrabold text-ink-900">
                  {formatMNTCompact(pin.dailyRate, locale)}{" "}
                  <span className="font-semibold text-ink-500">
                    {t("common.perDay")}
                  </span>
                </p>
                <Link
                  href={`${hrefBase}/${pin.id}`}
                  className="mt-1.5 inline-block text-[13px] font-bold text-brand-600"
                >
                  {t("common.view")} →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
