import type { LatLng } from "./geo";

export type District = {
  name: string;
  nameEn: string;
} & LatLng;

export type Aimag = {
  name: string;
  nameEn: string;
  districts: District[];
} & LatLng;

/**
 * Mongolia's 21 aimags plus Ulaanbaatar, with the centre of each administrative
 * seat. Equipment and orders resolve their coordinates from here, so the map
 * view and the distance term in the matching engine share one source of truth.
 */
export const AIMAGS: Aimag[] = [
  {
    name: "Улаанбаатар",
    nameEn: "Ulaanbaatar",
    lat: 47.9187,
    lng: 106.9177,
    districts: [
      { name: "Багануур", nameEn: "Baganuur", lat: 47.8286, lng: 108.3486 },
      { name: "Багахангай", nameEn: "Bagakhangai", lat: 47.38, lng: 107.52 },
      { name: "Баянгол", nameEn: "Bayangol", lat: 47.916, lng: 106.848 },
      { name: "Баянзүрх", nameEn: "Bayanzurkh", lat: 47.925, lng: 107.0 },
      { name: "Налайх", nameEn: "Nalaikh", lat: 47.77, lng: 107.25 },
      { name: "Сонгинохайрхан", nameEn: "Songinokhairkhan", lat: 47.92, lng: 106.77 },
      { name: "Сүхбаатар", nameEn: "Sukhbaatar", lat: 47.93, lng: 106.93 },
      { name: "Хан-Уул", nameEn: "Khan-Uul", lat: 47.879, lng: 106.908 },
      { name: "Чингэлтэй", nameEn: "Chingeltei", lat: 47.94, lng: 106.91 },
    ],
  },
  {
    name: "Архангай",
    nameEn: "Arkhangai",
    lat: 47.475,
    lng: 101.455,
    districts: [{ name: "Цэцэрлэг", nameEn: "Tsetserleg", lat: 47.475, lng: 101.455 }],
  },
  {
    name: "Баян-Өлгий",
    nameEn: "Bayan-Ulgii",
    lat: 48.9686,
    lng: 89.9626,
    districts: [{ name: "Өлгий", nameEn: "Ulgii", lat: 48.9686, lng: 89.9626 }],
  },
  {
    name: "Баянхонгор",
    nameEn: "Bayankhongor",
    lat: 46.1944,
    lng: 100.7181,
    districts: [
      { name: "Баянхонгор", nameEn: "Bayankhongor", lat: 46.1944, lng: 100.7181 },
    ],
  },
  {
    name: "Булган",
    nameEn: "Bulgan",
    lat: 48.8125,
    lng: 103.5347,
    districts: [{ name: "Булган", nameEn: "Bulgan", lat: 48.8125, lng: 103.5347 }],
  },
  {
    name: "Говь-Алтай",
    nameEn: "Govi-Altai",
    lat: 46.3728,
    lng: 96.2572,
    districts: [{ name: "Алтай", nameEn: "Altai", lat: 46.3728, lng: 96.2572 }],
  },
  {
    name: "Говьсүмбэр",
    nameEn: "Govisumber",
    lat: 46.3611,
    lng: 108.3611,
    districts: [{ name: "Чойр", nameEn: "Choir", lat: 46.3611, lng: 108.3611 }],
  },
  {
    name: "Дархан-Уул",
    nameEn: "Darkhan-Uul",
    lat: 49.4867,
    lng: 105.9228,
    districts: [{ name: "Дархан", nameEn: "Darkhan", lat: 49.4867, lng: 105.9228 }],
  },
  {
    name: "Дорноговь",
    nameEn: "Dornogovi",
    lat: 44.8917,
    lng: 110.1361,
    districts: [{ name: "Сайншанд", nameEn: "Sainshand", lat: 44.8917, lng: 110.1361 }],
  },
  {
    name: "Дорнод",
    nameEn: "Dornod",
    lat: 48.0778,
    lng: 114.535,
    districts: [{ name: "Чойбалсан", nameEn: "Choibalsan", lat: 48.0778, lng: 114.535 }],
  },
  {
    name: "Дундговь",
    nameEn: "Dundgovi",
    lat: 45.7625,
    lng: 106.2708,
    districts: [{ name: "Мандалговь", nameEn: "Mandalgovi", lat: 45.7625, lng: 106.2708 }],
  },
  {
    name: "Завхан",
    nameEn: "Zavkhan",
    lat: 47.7417,
    lng: 96.8444,
    districts: [{ name: "Улиастай", nameEn: "Uliastai", lat: 47.7417, lng: 96.8444 }],
  },
  {
    name: "Орхон",
    nameEn: "Orkhon",
    lat: 49.0278,
    lng: 104.0444,
    districts: [{ name: "Эрдэнэт", nameEn: "Erdenet", lat: 49.0278, lng: 104.0444 }],
  },
  {
    name: "Өвөрхангай",
    nameEn: "Uvurkhangai",
    lat: 46.2639,
    lng: 102.775,
    districts: [{ name: "Арвайхээр", nameEn: "Arvaikheer", lat: 46.2639, lng: 102.775 }],
  },
  {
    name: "Өмнөговь",
    nameEn: "Umnugovi",
    lat: 43.5708,
    lng: 104.425,
    districts: [
      { name: "Даланзадгад", nameEn: "Dalanzadgad", lat: 43.5708, lng: 104.425 },
      { name: "Ханбогд", nameEn: "Khanbogd", lat: 43.1919, lng: 107.1958 },
    ],
  },
  {
    name: "Сүхбаатар",
    nameEn: "Sukhbaatar",
    lat: 46.6806,
    lng: 113.2792,
    districts: [{ name: "Баруун-Урт", nameEn: "Baruun-Urt", lat: 46.6806, lng: 113.2792 }],
  },
  {
    name: "Сэлэнгэ",
    nameEn: "Selenge",
    lat: 50.2264,
    lng: 106.2069,
    districts: [{ name: "Сүхбаатар", nameEn: "Sukhbaatar", lat: 50.2264, lng: 106.2069 }],
  },
  {
    name: "Төв",
    nameEn: "Tuv",
    lat: 47.7069,
    lng: 106.9525,
    districts: [{ name: "Зуунмод", nameEn: "Zuunmod", lat: 47.7069, lng: 106.9525 }],
  },
  {
    name: "Увс",
    nameEn: "Uvs",
    lat: 49.9811,
    lng: 92.0667,
    districts: [{ name: "Улаангом", nameEn: "Ulaangom", lat: 49.9811, lng: 92.0667 }],
  },
  {
    name: "Ховд",
    nameEn: "Khovd",
    lat: 48.0056,
    lng: 91.6419,
    districts: [{ name: "Жаргалант", nameEn: "Jargalant", lat: 48.0056, lng: 91.6419 }],
  },
  {
    name: "Хөвсгөл",
    nameEn: "Khuvsgul",
    lat: 49.6342,
    lng: 100.1625,
    districts: [{ name: "Мөрөн", nameEn: "Muron", lat: 49.6342, lng: 100.1625 }],
  },
  {
    name: "Хэнтий",
    nameEn: "Khentii",
    lat: 47.3194,
    lng: 110.6556,
    districts: [{ name: "Чингис хот", nameEn: "Chinggis City", lat: 47.3194, lng: 110.6556 }],
  },
];

export const AIMAG_NAMES = AIMAGS.map((a) => a.name);

export function findAimag(name: string) {
  return AIMAGS.find((a) => a.name === name);
}

export function districtsOf(aimagName: string) {
  return findAimag(aimagName)?.districts ?? [];
}

/** Resolves a place to coordinates, falling back to the aimag centre. */
export function coordinatesFor(aimagName: string, districtName?: string | null): LatLng {
  const aimag = findAimag(aimagName);
  if (!aimag) return { lat: 47.9187, lng: 106.9177 };

  const district = districtName
    ? aimag.districts.find((d) => d.name === districtName)
    : undefined;

  return district
    ? { lat: district.lat, lng: district.lng }
    : { lat: aimag.lat, lng: aimag.lng };
}

/** "Улаанбаатар, Баянгол" — or the English pair when the locale asks for it. */
export function formatPlace(
  aimagName: string,
  districtName?: string | null,
  locale = "mn",
) {
  const aimag = findAimag(aimagName);
  if (!aimag) return districtName ? `${aimagName}, ${districtName}` : aimagName;

  const district = districtName
    ? aimag.districts.find((d) => d.name === districtName)
    : undefined;

  const a = locale === "en" ? aimag.nameEn : aimag.name;
  if (!district) return a;

  const d = locale === "en" ? district.nameEn : district.name;
  return `${a}, ${d}`;
}
