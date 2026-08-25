import {
  matchOrder,
  type EquipmentCandidate,
  type OperatorCandidate,
} from "../../lib/matching/engine";
import { coordinatesFor } from "../../lib/locations";
import type { PrismaClient } from "../../lib/generated/prisma/client";
import { rng } from "./history";

/**
 * Open orders with live, unanswered offers. Without these the company persona
 * lands on a page of finished history and the matching engine — the thing the
 * decks lead with — has nothing to show.
 */

const OPEN_JOBS = [
  {
    title: "Оффисын барилгын суурь ухалт",
    description:
      "Төвийн бүсэд 12 давхар оффисын барилгын суурийн ажил. Хөрс зөөвөрлөлт орно.",
    category: "EXCAVATOR" as const,
    needsOperator: true,
    durationDays: 14,
    startsInDays: 6,
  },
  {
    title: "Агуулахын талбай тэгшилгээ",
    description: "10 000 м2 талбайн хөрс тэгшилж, нягтруулах ажил.",
    category: "BULLDOZER" as const,
    needsOperator: true,
    durationDays: 9,
    startsInDays: 11,
  },
  {
    title: "Модулийн угсралтын кран",
    description: "Модулиар угсрах барилгын ажилд 25 тонноос дээш өргөх чадалтай кран.",
    category: "CRANE" as const,
    needsOperator: true,
    durationDays: 21,
    startsInDays: 8,
  },
  {
    title: "Хайрга, элсний тээвэрлэлт",
    description: "Карьераас барилгын талбай хүртэл өдөрт 6 рейс.",
    category: "TRUCK" as const,
    needsOperator: false,
    durationDays: 12,
    startsInDays: 4,
  },
  {
    title: "Агуулахын материал ачилт",
    description: "Агуулахын дотоод ачилт, буулгалтын ажил. Сэрээт ачигч шаардлагатай.",
    category: "FORKLIFT" as const,
    needsOperator: true,
    durationDays: 16,
    startsInDays: 9,
  },
];

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

const BLOCKING = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"] as const;

async function loadCandidates(db: PrismaClient, category: string) {
  const equipment = await db.equipment.findMany({
    where: { category: category as never, status: "ACTIVE" },
    include: {
      bookings: {
        where: { status: { in: [...BLOCKING] } },
        select: { startDate: true, endDate: true },
      },
      availability: { select: { startDate: true, endDate: true } },
    },
  });

  const operators = await db.operatorProfile.findMany({
    where: { available: true, skills: { has: category as never } },
    include: {
      user: { select: { id: true, name: true } },
      bookings: {
        where: { status: { in: [...BLOCKING] } },
        select: { startDate: true, endDate: true },
      },
    },
  });

  const equipmentCandidates: EquipmentCandidate[] = equipment.map((e) => ({
    id: e.id,
    ownerId: e.ownerId,
    category: e.category,
    make: e.make,
    model: e.model,
    status: e.status,
    location: { lat: e.lat, lng: e.lng },
    dailyRate: e.dailyRate,
    monthlyRate: e.monthlyRate,
    withOperator: e.withOperator,
    ratingAvg: e.ratingAvg,
    ratingCount: e.ratingCount,
    busy: [...e.bookings, ...e.availability].map((b) => ({
      start: b.startDate,
      end: b.endDate,
    })),
  }));

  const operatorCandidates: OperatorCandidate[] = operators.map((o) => ({
    id: o.id,
    userId: o.userId,
    name: o.user.name,
    skills: o.skills,
    location: coordinatesFor(o.aimag, o.district),
    dailyRate: o.dailyRate,
    ratingAvg: o.ratingAvg,
    ratingCount: o.ratingCount,
    level: o.level,
    jobsDone: o.jobsDone,
    available: o.available,
    busy: o.bookings.map((b) => ({ start: b.startDate, end: b.endDate })),
  }));

  return { equipmentCandidates, operatorCandidates };
}

export async function seedOpenOrders(db: PrismaClient) {
  const companies = await db.companyProfile.findMany({
    include: { user: { select: { id: true } } },
    orderBy: { id: "asc" },
  });

  if (companies.length === 0) return { orders: 0, matches: 0 };

  const random = rng(7717);
  const today = new Date();

  let orders = 0;
  let matches = 0;

  for (const [index, job] of OPEN_JOBS.entries()) {
    const company = companies[index % companies.length];
    const startDate = addDays(today, job.startsInDays);
    const endDate = addDays(startDate, job.durationDays);
    const { lat, lng } = coordinatesFor(company.aimag, company.district);

    // A budget that mostly fits, so some offers land inside it and some don't —
    // which is what makes the price factor visible in the demo.
    const roughDaily = 550_000 + Math.floor(random() * 350_000);
    const budgetMax = Math.round(roughDaily * job.durationDays * 1.15);

    const order = await db.order.create({
      data: {
        companyId: company.user.id,
        title: job.title,
        description: job.description,
        category: job.category,
        status: "OPEN",
        startDate,
        endDate,
        aimag: company.aimag,
        district: company.district,
        lat,
        lng,
        needsOperator: job.needsOperator,
        budgetMin: Math.round(budgetMax * 0.7),
        budgetMax,
        createdAt: addDays(today, -(1 + Math.floor(random() * 4))),
      },
    });
    orders++;

    const { equipmentCandidates, operatorCandidates } = await loadCandidates(
      db,
      job.category,
    );

    const { matches: scored } = matchOrder(
      {
        category: job.category,
        location: { lat, lng },
        range: { start: startDate, end: endDate },
        needsOperator: job.needsOperator,
        budgetMin: order.budgetMin,
        budgetMax: order.budgetMax,
      },
      equipmentCandidates,
      operatorCandidates,
      { limit: 8 },
    );

    if (scored.length === 0) continue;

    await db.match.createMany({
      data: scored.map((m) => ({
        orderId: order.id,
        equipmentId: m.equipment.id,
        operatorId: m.operator?.id ?? null,
        score: m.score,
        breakdown: {
          factors: m.factors,
          quotedAmount: m.quotedAmount,
          days: m.days,
        },
        distanceKm: m.distanceKm,
        quotedAmount: m.quotedAmount,
        status: "SUGGESTED" as const,
        createdAt: order.createdAt,
      })),
    });
    matches += scored.length;

    await db.order.update({
      where: { id: order.id },
      data: { status: "MATCHED" },
    });

    await db.notification.create({
      data: {
        userId: company.user.id,
        type: "ORDER_MATCHED",
        data: { orderTitle: job.title, count: scored.length },
        link: `/company/orders/${order.id}`,
        createdAt: order.createdAt,
      },
    });
  }

  return { orders, matches };
}
