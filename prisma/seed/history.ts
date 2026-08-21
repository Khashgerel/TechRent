import { postTransaction } from "../../lib/escrow/ledger";
import type { PrismaClient } from "../../lib/generated/prisma/client";
import { splitBookingAmount } from "../../lib/money";
import { distanceKm } from "../../lib/geo";

/** Deterministic PRNG so a reseed produces the same demo, every time. */
export function rng(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const JOB_TITLES = [
  "Барилгын суурийн ухалт",
  "Замын засварын ажил",
  "Хөрс тээвэрлэлт",
  "Талбай тэгшилгээ",
  "Уурхайн хөрс хуулалт",
  "Бетон цутгалтын ажил",
  "Суваг шуудуу татах",
  "Материал ачилт, буулгалт",
  "Барилгын угсралтын ажил",
  "Хайрга, элс тээвэрлэлт",
  "Инженерийн шугам сүлжээ",
  "Гүүрийн суурийн ажил",
];

const JOB_NOTES = [
  "Ажлын талбай хот дотор, өдрийн ээлжээр ажиллана.",
  "Оператортай хамт захиалж байна. Түлш захиалагч талаас.",
  "Ажил 7 хоногийн турш үргэлжилнэ.",
  "Талбайд нэвтрэх зөвшөөрөл гаргасан.",
  "Яаралтай ажил, шуурхай эхлүүлэх шаардлагатай.",
];

const REVIEW_COMMENTS = [
  "Цаг тухайд нь ирж, ажлаа чанартай гүйцэтгэсэн.",
  "Техник сайн нөхцөлтэй байсан. Дахин хамтарна.",
  "Оператор мэргэжлийн түвшинд ажилласан.",
  "Ажил төлөвлөсөн хугацаанаас өмнө дууссан.",
  "Харилцаа сайтай, найдвартай хамтрагч.",
  "Бүх зүйл гэрээний дагуу явагдсан.",
];

type Ctx = {
  db: PrismaClient;
  escrowId: string;
  revenueId: string;
  externalId: string;
  commissionRate: number;
  depositPercent: number;
  operatorShare: number;
};

export type EquipmentRow = {
  id: string;
  ownerId: string;
  category: string;
  make: string;
  model: string;
  dailyRate: number;
  aimag: string;
  district: string | null;
  lat: number;
  lng: number;
  withOperator: boolean;
  owner: { id: string; wallet: { id: string } | null };
};

export type OperatorRow = {
  id: string;
  userId: string;
  skills: string[];
  dailyRate: number;
  aimag: string;
  user: { id: string; wallet: { id: string } | null };
};

export type CompanyRow = {
  id: string;
  companyName: string;
  aimag: string;
  district: string | null;
  user: { id: string; wallet: { id: string } | null };
};

function daysBetween(start: Date, end: Date) {
  return Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Builds one finished job all the way through: order → match → booking →
 * escrow movements → reviews. Uses the same amount split the live escrow code
 * will use, so historical rows and new ones are shaped identically.
 */
async function completedJob(
  ctx: Ctx,
  equipment: EquipmentRow,
  operator: OperatorRow | null,
  company: CompanyRow,
  startedAt: Date,
  durationDays: number,
  random: () => number,
) {
  const { db } = ctx;

  const endDate = addDays(startedAt, durationDays);
  const equipmentTotal = equipment.dailyRate * durationDays;
  const operatorTotal = operator ? operator.dailyRate * durationDays : 0;
  const total = equipmentTotal + operatorTotal;

  const { commissionAmount, ownerPayout, operatorPayout } = splitBookingAmount(
    total,
    ctx.commissionRate,
    ctx.operatorShare,
    Boolean(operator),
  );
  const depositAmount = Math.round(total * ctx.depositPercent);

  const title = JOB_TITLES[Math.floor(random() * JOB_TITLES.length)];

  const order = await db.order.create({
    data: {
      companyId: company.user.id,
      title,
      description: JOB_NOTES[Math.floor(random() * JOB_NOTES.length)],
      category: equipment.category as never,
      status: "PAID",
      startDate: startedAt,
      endDate,
      aimag: equipment.aimag,
      district: equipment.district,
      lat: equipment.lat,
      lng: equipment.lng,
      needsOperator: Boolean(operator),
      budgetMin: Math.round(total * 0.9),
      budgetMax: Math.round(total * 1.15),
      createdAt: addDays(startedAt, -4),
    },
  });

  const km = distanceKm(
    { lat: equipment.lat, lng: equipment.lng },
    { lat: equipment.lat, lng: equipment.lng },
  );

  const match = await db.match.create({
    data: {
      orderId: order.id,
      equipmentId: equipment.id,
      operatorId: operator?.id,
      score: 80 + Math.floor(random() * 18),
      breakdown: {
        distance: 90,
        category: 100,
        skills: operator ? 95 : 0,
        price: 85,
        rating: 92,
        availability: 100,
      },
      distanceKm: km,
      quotedAmount: total,
      status: "ACCEPTED",
      respondedAt: addDays(startedAt, -3),
      createdAt: addDays(startedAt, -4),
    },
  });

  const booking = await db.booking.create({
    data: {
      orderId: order.id,
      matchId: match.id,
      equipmentId: equipment.id,
      operatorId: operator?.id,
      startDate: startedAt,
      endDate,
      totalAmount: total,
      depositAmount,
      commissionRate: ctx.commissionRate,
      commissionAmount,
      ownerPayout,
      operatorPayout,
      status: "PAID",
      confirmedAt: addDays(startedAt, -3),
      startedAt,
      completedAt: endDate,
      verifiedAt: addDays(endDate, 1),
      paidAt: addDays(endDate, 1),
      createdAt: addDays(startedAt, -4),
    },
  });

  const companyWallet = company.user.wallet!.id;
  const ownerWallet = equipment.owner.wallet!.id;

  // The client funds their wallet, the platform holds the money, then releases
  // it once the work is verified.
  await postTransaction(db, {
    type: "TOPUP",
    bookingId: booking.id,
    memo: "Дансаа цэнэглэсэн",
    createdAt: addDays(startedAt, -3),
    entries: [
      { accountId: ctx.externalId, amount: -total },
      { accountId: companyWallet, amount: total },
    ],
  });

  await postTransaction(db, {
    type: "DEPOSIT_HOLD",
    bookingId: booking.id,
    memo: "Урьдчилгаа барьцаа",
    createdAt: addDays(startedAt, -3),
    entries: [
      { accountId: companyWallet, amount: -depositAmount },
      { accountId: ctx.escrowId, amount: depositAmount },
    ],
  });

  await postTransaction(db, {
    type: "BALANCE_HOLD",
    bookingId: booking.id,
    memo: "Үлдэгдэл төлбөр",
    createdAt: startedAt,
    entries: [
      { accountId: companyWallet, amount: -(total - depositAmount) },
      { accountId: ctx.escrowId, amount: total - depositAmount },
    ],
  });

  const releaseEntries = [
    { accountId: ctx.escrowId, amount: -total },
    { accountId: ownerWallet, amount: ownerPayout },
    { accountId: ctx.revenueId, amount: commissionAmount },
  ];
  if (operator && operatorPayout > 0) {
    releaseEntries.push({
      accountId: operator.user.wallet!.id,
      amount: operatorPayout,
    });
  }

  await postTransaction(db, {
    type: "RELEASE",
    bookingId: booking.id,
    memo: "Ажил баталгаажсаны дараах тооцоо",
    createdAt: addDays(endDate, 1),
    entries: releaseEntries,
  });

  // Two-way reviews, as the decks describe.
  const comment = () =>
    REVIEW_COMMENTS[Math.floor(random() * REVIEW_COMMENTS.length)];
  const score = () => (random() > 0.25 ? 5 : 4);

  await db.review.create({
    data: {
      bookingId: booking.id,
      authorId: company.user.id,
      subjectType: "EQUIPMENT",
      subjectId: equipment.id,
      rating: score(),
      quality: score(),
      care: score(),
      comment: comment(),
      createdAt: addDays(endDate, 1),
    },
  });

  if (operator) {
    await db.review.create({
      data: {
        bookingId: booking.id,
        authorId: company.user.id,
        subjectType: "OPERATOR",
        subjectId: operator.id,
        rating: score(),
        punctuality: score(),
        quality: score(),
        comment: comment(),
        createdAt: addDays(endDate, 1),
      },
    });
  }

  await db.review.create({
    data: {
      bookingId: booking.id,
      authorId: equipment.owner.id,
      subjectType: "COMPANY",
      subjectId: company.id,
      rating: score(),
      comment: comment(),
      createdAt: addDays(endDate, 2),
    },
  });

  return booking;
}

/** An in-flight booking so dashboards have live work, not only history. */
async function activeJob(
  ctx: Ctx,
  equipment: EquipmentRow,
  operator: OperatorRow | null,
  company: CompanyRow,
  startedAt: Date,
  durationDays: number,
  status: "CONFIRMED" | "IN_PROGRESS" | "COMPLETED",
  random: () => number,
) {
  const { db } = ctx;
  const endDate = addDays(startedAt, durationDays);
  const equipmentTotal = equipment.dailyRate * durationDays;
  const operatorTotal = operator ? operator.dailyRate * durationDays : 0;
  const total = equipmentTotal + operatorTotal;

  const { commissionAmount, ownerPayout, operatorPayout } = splitBookingAmount(
    total,
    ctx.commissionRate,
    ctx.operatorShare,
    Boolean(operator),
  );
  const depositAmount = Math.round(total * ctx.depositPercent);

  const orderStatus =
    status === "COMPLETED" ? "COMPLETED" : status === "IN_PROGRESS" ? "IN_PROGRESS" : "CONFIRMED";

  const order = await db.order.create({
    data: {
      companyId: company.user.id,
      title: JOB_TITLES[Math.floor(random() * JOB_TITLES.length)],
      description: JOB_NOTES[Math.floor(random() * JOB_NOTES.length)],
      category: equipment.category as never,
      status: orderStatus,
      startDate: startedAt,
      endDate,
      aimag: equipment.aimag,
      district: equipment.district,
      lat: equipment.lat,
      lng: equipment.lng,
      needsOperator: Boolean(operator),
      budgetMin: Math.round(total * 0.9),
      budgetMax: Math.round(total * 1.15),
      createdAt: addDays(startedAt, -5),
    },
  });

  const match = await db.match.create({
    data: {
      orderId: order.id,
      equipmentId: equipment.id,
      operatorId: operator?.id,
      score: 82 + Math.floor(random() * 16),
      breakdown: {
        distance: 88,
        category: 100,
        skills: operator ? 90 : 0,
        price: 87,
        rating: 90,
        availability: 100,
      },
      distanceKm: 0,
      quotedAmount: total,
      status: "ACCEPTED",
      respondedAt: addDays(startedAt, -4),
      createdAt: addDays(startedAt, -5),
    },
  });

  const booking = await db.booking.create({
    data: {
      orderId: order.id,
      matchId: match.id,
      equipmentId: equipment.id,
      operatorId: operator?.id,
      startDate: startedAt,
      endDate,
      totalAmount: total,
      depositAmount,
      commissionRate: ctx.commissionRate,
      commissionAmount,
      ownerPayout,
      operatorPayout,
      status,
      confirmedAt: addDays(startedAt, -4),
      startedAt: status === "CONFIRMED" ? null : startedAt,
      completedAt: status === "COMPLETED" ? endDate : null,
      createdAt: addDays(startedAt, -5),
    },
  });

  const companyWallet = company.user.wallet!.id;

  await postTransaction(db, {
    type: "TOPUP",
    bookingId: booking.id,
    memo: "Дансаа цэнэглэсэн",
    createdAt: addDays(startedAt, -4),
    entries: [
      { accountId: ctx.externalId, amount: -total },
      { accountId: companyWallet, amount: total },
    ],
  });

  await postTransaction(db, {
    type: "DEPOSIT_HOLD",
    bookingId: booking.id,
    memo: "Урьдчилгаа барьцаа",
    createdAt: addDays(startedAt, -4),
    entries: [
      { accountId: companyWallet, amount: -depositAmount },
      { accountId: ctx.escrowId, amount: depositAmount },
    ],
  });

  // Once work starts the remaining balance is held too.
  if (status !== "CONFIRMED") {
    await postTransaction(db, {
      type: "BALANCE_HOLD",
      bookingId: booking.id,
      memo: "Үлдэгдэл төлбөр",
      createdAt: startedAt,
      entries: [
        { accountId: companyWallet, amount: -(total - depositAmount) },
        { accountId: ctx.escrowId, amount: total - depositAmount },
      ],
    });
  }

  return booking;
}

export async function seedHistory(ctx: Ctx, data: {
  equipment: EquipmentRow[];
  operators: OperatorRow[];
  companies: CompanyRow[];
}) {
  const { equipment, operators, companies } = data;
  const random = rng(20260821);
  const today = new Date();

  let completed = 0;
  let active = 0;

  for (const [index, item] of equipment.entries()) {
    // Operators only take jobs they're certified for.
    const capable = operators.filter((o) => o.skills.includes(item.category));

    const pick = () => ({
      company: companies[Math.floor(random() * companies.length)],
      operator:
        item.withOperator && capable.length
          ? capable[Math.floor(random() * capable.length)]
          : null,
    });

    // Spread finished work across the last eight months.
    const jobCount = 3 + Math.floor(random() * 4);
    for (let n = 0; n < jobCount; n++) {
      const { company, operator } = pick();
      const daysAgo = 35 + Math.floor(random() * 205);
      const duration = 3 + Math.floor(random() * 18);

      await completedJob(
        ctx,
        item,
        operator,
        company,
        addDays(today, -daysAgo),
        duration,
        random,
      );
      completed++;
    }

    // Every machine also settles at least one job inside the current month, so
    // "revenue this month" is never a dead zero on a demo dashboard.
    {
      const { company, operator } = pick();
      const duration = 4 + Math.floor(random() * 8);
      const endedDaysAgo = 2 + Math.floor(random() * 12);

      await completedJob(
        ctx,
        item,
        operator,
        company,
        addDays(today, -(endedDaysAgo + duration)),
        duration,
        random,
      );
      completed++;
    }

    // Half the fleet is working right now, which keeps utilisation realistic.
    if (index % 2 === 0) {
      const { company, operator } = pick();
      const phase = index % 6;
      const status =
        phase === 0 ? "IN_PROGRESS" : phase === 2 ? "CONFIRMED" : "IN_PROGRESS";
      const start =
        status === "CONFIRMED" ? addDays(today, 3) : addDays(today, -6);

      await activeJob(
        ctx,
        item,
        operator,
        company,
        start,
        7 + Math.floor(random() * 14),
        status,
        random,
      );
      active++;
    } else if (index % 5 === 1) {
      // A few finished jobs awaiting the client's sign-off.
      const { company, operator } = pick();
      await activeJob(
        ctx,
        item,
        operator,
        company,
        addDays(today, -14),
        8,
        "COMPLETED",
        random,
      );
      active++;
    }
  }

  return { completed, active };
}

export { daysBetween, addDays };
