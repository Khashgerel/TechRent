import { coordinatesFor } from "../../lib/locations";

export { distanceKm } from "../../lib/geo";

export type Place = {
  aimag: string;
  district?: string;
  lat: number;
  lng: number;
};

/** Shorthand keys used by the seed fixtures, resolved against `lib/locations`. */
const PLACE_KEYS = {
  ubBayangol: ["Улаанбаатар", "Баянгол"],
  ubKhanUul: ["Улаанбаатар", "Хан-Уул"],
  ubSukhbaatar: ["Улаанбаатар", "Сүхбаатар"],
  ubBayanzurkh: ["Улаанбаатар", "Баянзүрх"],
  ubSonginokhairkhan: ["Улаанбаатар", "Сонгинохайрхан"],
  ubChingeltei: ["Улаанбаатар", "Чингэлтэй"],
  ubNalaikh: ["Улаанбаатар", "Налайх"],
  darkhan: ["Дархан-Уул", "Дархан"],
  erdenet: ["Орхон", "Эрдэнэт"],
  dalanzadgad: ["Өмнөговь", "Даланзадгад"],
  khanbogd: ["Өмнөговь", "Ханбогд"],
  sainshand: ["Дорноговь", "Сайншанд"],
  moron: ["Хөвсгөл", "Мөрөн"],
  khovd: ["Ховд", "Жаргалант"],
  zuunmod: ["Төв", "Зуунмод"],
} as const satisfies Record<string, readonly [string, string]>;

export const PLACES = Object.fromEntries(
  Object.entries(PLACE_KEYS).map(([key, [aimag, district]]) => [
    key,
    { aimag, district, ...coordinatesFor(aimag, district) },
  ]),
) as Record<keyof typeof PLACE_KEYS, Place>;

/** Nudges a base location a few kilometres so seeded pins don't stack. */
export function jitter(place: Place, seed: number): Place {
  const dx = (((seed * 37) % 100) / 100 - 0.5) * 0.08;
  const dy = (((seed * 53) % 100) / 100 - 0.5) * 0.08;
  return { ...place, lat: place.lat + dy, lng: place.lng + dx };
}
