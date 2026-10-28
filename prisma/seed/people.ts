import type { EquipmentCategory, OperatorLevel } from "../../lib/generated/prisma/enums";

export type OwnerSeed = {
  phone: string;
  name: string;
  companyName?: string;
  regNumber?: string;
  place: string;
  bio?: string;
  rating: [number, number];
};

export type OperatorSeed = {
  phone: string;
  name: string;
  place: string;
  level: OperatorLevel;
  points: number;
  years: number;
  skills: EquipmentCategory[];
  dailyRate: number;
  bio: string;
  rating: [number, number];
  jobsDone: number;
};

export type CompanySeed = {
  phone: string;
  name: string;
  companyName: string;
  regNumber: string;
  industry: string;
  place: string;
  rating: [number, number];
};

// The first entry of each list is the demo persona shown on /demo.
export const OWNERS: OwnerSeed[] = [
  {
    phone: "99112233",
    name: "Батболд Дорж",
    companyName: "Батболд Машин ХХК",
    regNumber: "6012345",
    place: "ubBayangol",
    bio: "15 жилийн туршлагатай, экскаватор болон ачааны машины парктай.",
    rating: [4.8, 34],
  },
  {
    phone: "99223344",
    name: "Ганбаатар Цэрэн",
    companyName: "Тэнгэр Машинери ХХК",
    regNumber: "6023456",
    place: "ubKhanUul",
    bio: "Уул уурхайн зориулалтын хүнд даацын техник түрээслүүлнэ.",
    rating: [4.6, 21],
  },
  {
    phone: "99334455",
    name: "Мөнхбат Няма",
    place: "darkhan",
    bio: "Дархан хотод үйл ажиллагаа явуулдаг.",
    rating: [4.4, 12],
  },
  {
    phone: "99445566",
    name: "Түвшинбаяр Ганболд",
    companyName: "Говь Эквипмент ХХК",
    regNumber: "6045678",
    place: "dalanzadgad",
    bio: "Өмнөговь аймагт уул уурхайн гэрээт ажил гүйцэтгэнэ.",
    rating: [4.9, 47],
  },
  {
    phone: "99556677",
    name: "Дорж Балдан",
    place: "erdenet",
    bio: "Эрдэнэт хотын барилгын компаниудтай хамтран ажилладаг.",
    rating: [4.2, 8],
  },
];

export const OPERATORS: OperatorSeed[] = [
  {
    phone: "88112233",
    name: "Ганзориг Батаа",
    place: "ubBayanzurkh",
    level: "ADVANCED",
    points: 1840,
    years: 12,
    skills: ["EXCAVATOR", "LOADER", "BULLDOZER"],
    dailyRate: 180000,
    bio: "Экскаватор, ачигчийн ангилалд гэрчилгээтэй. Уул уурхайн туршлагатай.",
    rating: [4.9, 56],
    jobsDone: 63,
  },
  {
    phone: "88223344",
    name: "Энхбат Сүрэн",
    place: "ubSonginokhairkhan",
    level: "INTERMEDIATE",
    points: 720,
    years: 6,
    skills: ["EXCAVATOR", "TRUCK"],
    dailyRate: 140000,
    bio: "Хот доторх барилгын ажлын туршлагатай.",
    rating: [4.5, 24],
    jobsDone: 28,
  },
  {
    phone: "88334455",
    name: "Батжаргал Оюун",
    place: "ubKhanUul",
    level: "INTERMEDIATE",
    points: 610,
    years: 5,
    skills: ["CRANE", "TRUCK"],
    dailyRate: 160000,
    bio: "Өндөр барилгын кран ажиллуулах гэрчилгээтэй.",
    rating: [4.7, 19],
    jobsDone: 22,
  },
  {
    phone: "88445566",
    name: "Пүрэвдорж Ням",
    place: "darkhan",
    level: "BEGINNER",
    points: 180,
    years: 2,
    skills: ["LOADER"],
    dailyRate: 95000,
    bio: "Академийн сургалтад хамрагдаж байгаа залуу оператор.",
    rating: [4.1, 6],
    jobsDone: 7,
  },
  {
    phone: "88556677",
    name: "Отгонбаяр Мягмар",
    place: "dalanzadgad",
    level: "ADVANCED",
    points: 1560,
    years: 10,
    skills: ["BULLDOZER", "GRADER", "EXCAVATOR"],
    dailyRate: 200000,
    bio: "Уул уурхайн талбайд урт хугацааны гэрээгээр ажилласан.",
    rating: [4.8, 41],
    jobsDone: 45,
  },
  {
    phone: "88667788",
    name: "Нямдорж Цогт",
    place: "erdenet",
    level: "INTERMEDIATE",
    points: 890,
    years: 7,
    skills: ["TRUCK", "CONCRETE_MIXER"],
    dailyRate: 130000,
    bio: "Бетон зөөвөрлөлт, ачаа тээвэрлэлтийн туршлагатай.",
    rating: [4.4, 17],
    jobsDone: 31,
  },
  {
    phone: "88778899",
    name: "Баярсайхан Дулам",
    place: "ubChingeltei",
    level: "BEGINNER",
    points: 260,
    years: 3,
    skills: ["FORKLIFT", "LOADER"],
    dailyRate: 90000,
    bio: "Агуулахын сэрээт ачигчийн туршлагатай.",
    rating: [4.3, 9],
    jobsDone: 11,
  },
  {
    phone: "88889900",
    name: "Сүхбаатар Лхагва",
    place: "moron",
    level: "INTERMEDIATE",
    points: 540,
    years: 4,
    skills: ["EXCAVATOR", "ROLLER"],
    dailyRate: 120000,
    bio: "Замын барилгын ажлын туршлагатай.",
    rating: [4.2, 11],
    jobsDone: 14,
  },
];

export const COMPANIES: CompanySeed[] = [
  {
    phone: "77112233",
    name: "Оюунчимэг Батаа",
    companyName: "Мон Барилга ХХК",
    regNumber: "2712345",
    industry: "Барилга угсралт",
    place: "ubSukhbaatar",
    rating: [4.7, 28],
  },
  {
    phone: "77223344",
    name: "Ариунболд Жаргал",
    companyName: "Гэрэгэ Констракшн ХХК",
    regNumber: "2723456",
    industry: "Дэд бүтэц",
    place: "ubKhanUul",
    rating: [4.5, 16],
  },
  {
    phone: "77334455",
    name: "Сарантуяа Мөнх",
    companyName: "Тэнгэр Групп ХХК",
    regNumber: "2734567",
    industry: "Уул уурхай",
    place: "dalanzadgad",
    rating: [4.9, 39],
  },
  {
    phone: "77445566",
    name: "Энхтуяа Дорж",
    companyName: "Оюу Инженеринг ХХК",
    regNumber: "2745678",
    industry: "Зам, гүүр",
    place: "erdenet",
    rating: [4.3, 12],
  },
];

export const ADMINS = [
  { phone: "70001111", name: "Системийн админ", username: "admin" },
];
