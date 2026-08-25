import { coordinatesFor } from "../../lib/locations";
import type { PrismaClient } from "../../lib/generated/prisma/client";
import type { EquipmentCategory } from "../../lib/generated/prisma/enums";

/**
 * Accounts waiting on the admin's decision.
 *
 * Without these the verification queue is empty on a fresh seed and the admin
 * console has nothing to demonstrate — every other seeded persona is already
 * verified because they have trading history. These have none: they registered,
 * uploaded their details, and are waiting.
 */

type PendingSeed = {
  phone: string;
  name: string;
  role: "OWNER" | "OPERATOR" | "COMPANY";
  aimag: string;
  district?: string;
  companyName?: string;
  regNumber?: string;
  bio?: string;
  skills?: EquipmentCategory[];
  yearsExperience?: number;
  industry?: string;
  /** A machine listed but not yet reviewable — owners register with their fleet. */
  equipment?: {
    category: EquipmentCategory;
    make: string;
    model: string;
    year: number;
    hourlyRate: number;
    dailyRate: number;
    monthlyRate: number;
  };
};

export const PENDING_USERS: PendingSeed[] = [
  {
    phone: "+97699120045",
    name: "Мөнхбат Даш",
    role: "OWNER",
    aimag: "Дархан-Уул",
    district: "Дархан",
    companyName: "Дархан Техник ХХК",
    regNumber: "6119045",
    bio: "Дархан хотод 4 нэгж техниктэй, шинээр бүртгүүлж байна.",
    equipment: {
      category: "EXCAVATOR",
      make: "Hyundai",
      model: "R220LC-9S",
      year: 2019,
      hourlyRate: 145_000,
      dailyRate: 1_050_000,
      monthlyRate: 24_500_000,
    },
  },
  {
    phone: "+97699120046",
    name: "Ганбаяр Сүх",
    role: "OPERATOR",
    aimag: "Улаанбаатар",
    district: "Сонгинохайрхан",
    bio: "9 жил кран ажиллуулсан, гэрчилгээгээ хүлээлгэн өгсөн.",
    skills: ["CRANE", "TRUCK"],
    yearsExperience: 9,
  },
  {
    phone: "+97699120047",
    name: "Сарантуяа Болд",
    role: "COMPANY",
    aimag: "Өмнөговь",
    district: "Даланзадгад",
    companyName: "Говь Инфра ХХК",
    regNumber: "6203318",
    industry: "Зам, дэд бүтэц",
  },
  {
    phone: "+97699120048",
    name: "Энхтөр Наран",
    role: "OWNER",
    aimag: "Улаанбаатар",
    district: "Баянзүрх",
    companyName: "Наран Констракшн ХХК",
    regNumber: "6144902",
    bio: "Бетон зөөвөрлөгч, ачааны машины паркаа түрээслүүлэхээр бүртгүүлэв.",
    equipment: {
      category: "CONCRETE_MIXER",
      make: "Shacman",
      model: "F3000 9m³",
      year: 2021,
      hourlyRate: 95_000,
      dailyRate: 720_000,
      monthlyRate: 17_000_000,
    },
  },
];

export async function seedPendingUsers(db: PrismaClient) {
  let created = 0;

  for (const person of PENDING_USERS) {
    const { lat, lng } = coordinatesFor(person.aimag, person.district ?? null);

    const user = await db.user.create({
      data: {
        phone: person.phone,
        name: person.name,
        role: person.role,
        // Registered and waiting: no `verifiedAt`, nothing traded yet.
        verification: "PENDING",
        wallet: { create: { kind: "USER_WALLET", label: person.name } },
        ...(person.role === "OWNER"
          ? {
              ownerProfile: {
                create: {
                  companyName: person.companyName,
                  regNumber: person.regNumber,
                  aimag: person.aimag,
                  district: person.district,
                  bio: person.bio,
                },
              },
            }
          : {}),
        ...(person.role === "OPERATOR"
          ? {
              operatorProfile: {
                create: {
                  aimag: person.aimag,
                  district: person.district,
                  bio: person.bio,
                  skills: person.skills ?? [],
                  yearsExperience: person.yearsExperience ?? 0,
                  dailyRate: 180_000,
                },
              },
            }
          : {}),
        ...(person.role === "COMPANY"
          ? {
              companyProfile: {
                create: {
                  companyName: person.companyName ?? person.name,
                  regNumber: person.regNumber,
                  industry: person.industry,
                  aimag: person.aimag,
                  district: person.district,
                },
              },
            }
          : {}),
      },
    });

    if (person.equipment) {
      await db.equipment.create({
        data: {
          ownerId: user.id,
          ...person.equipment,
          // Their fleet waits with them — nothing an unverified owner lists is
          // bookable until the account itself is approved.
          status: "PENDING_REVIEW",
          aimag: person.aimag,
          district: person.district,
          lat,
          lng,
          photos: [],
        },
      });
    }

    created += 1;
  }

  return { pendingUsers: created };
}
