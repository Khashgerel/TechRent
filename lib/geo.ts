export type LatLng = { lat: number; lng: number };

/** Great-circle distance in kilometres. */
export function distanceKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Centre of Mongolia, used as the default map view. */
export const MONGOLIA_CENTER: LatLng = { lat: 47.5, lng: 104.5 };
export const ULAANBAATAR: LatLng = { lat: 47.9187, lng: 106.9177 };
