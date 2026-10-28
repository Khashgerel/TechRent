import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { withConnectionRetry } from "../lib/db-retry";
import { PrismaClient } from "../lib/generated/prisma/client";
import { EQUIPMENT } from "./seed/equipment";
import { jitter, PLACES, type Place } from "./seed/locations";
import { ADMINS, COMPANIES, OPERATORS, OWNERS } from "./seed/people";
import {
  EXTRA_EQUIPMENT,
  EXTRA_OPERATORS,
  EXTRA_OWNERS,
} from "./seed/fleet-extra";
import { MORE_OPERATORS } from "./seed/operators-extra";
import { seedHistory } from "./seed/history";
import { seedOpenOrders } from "./seed/open-orders";
import { seedAcademy, seedAcademyProgress } from "./seed/academy";
import { seedStore } from "./seed/parts";
import { seedPendingUsers } from "./seed/pending";

/**
 * The seed writes thousands of rows in a row, which is exactly when a pooled
 * connection is most likely to be dropped underneath it. It uses the same retry
 * policy as the app so `db:reset` is dependable — it runs before every demo.
 */
function seedPool() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
  });

  pool.on("error", () => {});

  const query = pool.query.bind(pool);
  pool.query = ((...args: unknown[]) =>
    withConnectionRetry(() =>
      (query as (...a: unknown[]) => Promise<unknown>)(...args),
    )) as typeof pool.query;

  return pool;
}

const db = new PrismaClient({ adapter: new PrismaPg(seedPool()) });

function place(key: string): Place {
  const found = (PLACES as Record<string, Place>)[key];
  if (!found) throw new Error(`Unknown seed place: ${key}`);
  return found;
}

/**
 * Wipes every table. Order matters — children before parents — because the seed
 * is meant to be re-runnable at any time, including right before a demo.
 */
async function reset() {
  await db.$transaction([
    db.ledgerEntry.deleteMany(),
    db.ledgerTransaction.deleteMany(),
    db.storeOrderItem.deleteMany(),
    db.storeOrder.deleteMany(),
    db.serviceRequest.deleteMany(),
    db.part.deleteMany(),
    db.certificate.deleteMany(),
    db.quizAttempt.deleteMany(),
    db.lessonCompletion.deleteMany(),
    db.enrollment.deleteMany(),
    db.quizQuestion.deleteMany(),
    db.lesson.deleteMany(),
    db.course.deleteMany(),
    db.review.deleteMany(),
    db.notification.deleteMany(),
    db.booking.deleteMany(),
    db.match.deleteMany(),
    db.order.deleteMany(),
    db.availabilityBlock.deleteMany(),
    db.equipment.deleteMany(),
    db.account.deleteMany(),
    db.operatorProfile.deleteMany(),
    db.ownerProfile.deleteMany(),
    db.companyProfile.deleteMany(),
    db.auditLog.deleteMany(),
    db.loginAttempt.deleteMany(),
    db.user.deleteMany(),
    db.platformSettings.deleteMany(),
  ]);
}

async function seedPlatform() {
  await db.platformSettings.create({ data: { id: "singleton" } });

  await db.account.createMany({
    data: [
      { kind: "ESCROW", label: "Escrow holding account" },
      { kind: "PLATFORM_REVENUE", label: "Platform commission revenue" },
      { kind: "EXTERNAL", label: "Bank / payment gateway settlement" },
    ],
  });
}

async function seedUsers() {
  const verified = { verification: "VERIFIED" as const, verifiedAt: new Date() };

  for (const owner of [...OWNERS, ...EXTRA_OWNERS]) {
    const p = place(owner.place);
    await db.user.create({
      data: {
        phone: owner.phone,
        name: owner.name,
        roles: ["OWNER"],
        activeRole: "OWNER",
        ...verified,
        wallet: { create: { kind: "USER_WALLET", label: owner.name } },
        ownerProfile: {
          create: {
            companyName: owner.companyName,
            regNumber: owner.regNumber,
            aimag: p.aimag,
            district: p.district,
            bio: owner.bio,
            ratingAvg: owner.rating[0],
            ratingCount: owner.rating[1],
          },
        },
      },
    });
  }

  for (const op of [...OPERATORS, ...EXTRA_OPERATORS, ...MORE_OPERATORS]) {
    const p = place(op.place);
    await db.user.create({
      data: {
        phone: op.phone,
        name: op.name,
        roles: ["OPERATOR"],
        activeRole: "OPERATOR",
        ...verified,
        wallet: { create: { kind: "USER_WALLET", label: op.name } },
        operatorProfile: {
          create: {
            level: op.level,
            points: op.points,
            yearsExperience: op.years,
            skills: op.skills,
            aimag: p.aimag,
            district: p.district,
            bio: op.bio,
            dailyRate: op.dailyRate,
            ratingAvg: op.rating[0],
            ratingCount: op.rating[1],
            jobsDone: op.jobsDone,
          },
        },
      },
    });
  }

  for (const co of COMPANIES) {
    const p = place(co.place);
    await db.user.create({
      data: {
        phone: co.phone,
        name: co.name,
        roles: ["COMPANY"],
        activeRole: "COMPANY",
        ...verified,
        wallet: { create: { kind: "USER_WALLET", label: co.companyName } },
        companyProfile: {
          create: {
            companyName: co.companyName,
            regNumber: co.regNumber,
            industry: co.industry,
            aimag: p.aimag,
            district: p.district,
            ratingAvg: co.rating[0],
            ratingCount: co.rating[1],
          },
        },
      },
    });
  }

  for (const admin of ADMINS) {
    await db.user.create({
      data: {
        phone: admin.phone,
        name: admin.name,
        // A username but deliberately no password: staff sign in at
        // /[locale]/staff-login, and the only thing that can set a password is
        // `npm run admin:create`. Seeding one would put a known credential on
        // a public URL.
        username: admin.username,
        roles: ["ADMIN"],
        activeRole: "ADMIN",
        ...verified,
        wallet: { create: { kind: "USER_WALLET", label: admin.name } },
      },
    });
  }
}

async function seedEquipment() {
  const owners = await db.user.findMany({ where: { roles: { has: "OWNER" } } });
  const byPhone = new Map(owners.map((o) => [o.phone, o.id]));

  for (const [index, item] of [...EQUIPMENT, ...EXTRA_EQUIPMENT].entries()) {
    const ownerId = byPhone.get(item.ownerPhone);
    if (!ownerId) throw new Error(`No owner for phone ${item.ownerPhone}`);

    const p = jitter(place(item.place), index + 1);

    await db.equipment.create({
      data: {
        ownerId,
        category: item.category,
        make: item.make,
        model: item.model,
        year: item.year,
        hourlyRate: item.hourlyRate,
        dailyRate: item.dailyRate,
        monthlyRate: item.monthlyRate,
        aimag: p.aimag,
        district: p.district,
        lat: p.lat,
        lng: p.lng,
        description: item.description,
        withOperator: item.withOperator,
        photos: [],
        specs: item.specs,
        ratingAvg: item.rating[0],
        ratingCount: item.rating[1],
        // A realistic fleet isn't uniformly available.
        status: index === 5 ? "MAINTENANCE" : index === 16 ? "INACTIVE" : "ACTIVE",
      },
    });
  }
}

/** A handful of owner-declared unavailable ranges so the calendar isn't empty. */
async function seedAvailability() {
  const equipment = await db.equipment.findMany({ take: 6, orderBy: { createdAt: "asc" } });
  const today = new Date();

  for (const [index, item] of equipment.entries()) {
    if (index % 2 !== 0) continue;

    const start = new Date(today);
    start.setDate(start.getDate() + 5 + index * 3);
    const end = new Date(start);
    end.setDate(end.getDate() + 3);

    await db.availabilityBlock.create({
      data: {
        equipmentId: item.id,
        startDate: start,
        endDate: end,
        reason: "Төлөвлөгөөт засвар",
      },
    });
  }
}

async function seedJobHistory() {
  const settings = await db.platformSettings.findUniqueOrThrow({
    where: { id: "singleton" },
  });

  const [escrow, revenue, external] = await Promise.all([
    db.account.findFirstOrThrow({ where: { kind: "ESCROW" } }),
    db.account.findFirstOrThrow({ where: { kind: "PLATFORM_REVENUE" } }),
    db.account.findFirstOrThrow({ where: { kind: "EXTERNAL" } }),
  ]);

  const equipment = await db.equipment.findMany({
    include: { owner: { include: { wallet: true } } },
    orderBy: { createdAt: "asc" },
  });
  const operators = await db.operatorProfile.findMany({
    include: { user: { include: { wallet: true } } },
  });
  const companies = await db.companyProfile.findMany({
    include: { user: { include: { wallet: true } } },
  });

  return seedHistory(
    {
      db,
      escrowId: escrow.id,
      revenueId: revenue.id,
      externalId: external.id,
      commissionRate: settings.commissionRate,
      depositPercent: settings.depositPercent,
      operatorShare: settings.operatorShare,
    },
    { equipment, operators, companies },
  );
}

/** Recent activity turned into unread notifications so the bell has content. */
async function seedNotifications() {
  const bookings = await db.booking.findMany({
    where: { status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] } },
    include: {
      order: { include: { company: { include: { companyProfile: true } } } },
      equipment: { include: { owner: true } },
      operator: { include: { user: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 24,
  });

  for (const booking of bookings) {
    const companyName =
      booking.order.company.companyProfile?.companyName ?? booking.order.company.name;
    const equipmentName = booking.equipment
      ? `${booking.equipment.make} ${booking.equipment.model}`
      : "";

    const payload = {
      orderTitle: booking.order.title,
      companyName,
      equipmentName,
      amount: booking.totalAmount,
    };

    const type =
      booking.status === "CONFIRMED"
        ? "BOOKING_CONFIRMED"
        : booking.status === "IN_PROGRESS"
          ? "BOOKING_STARTED"
          : "BOOKING_COMPLETED";

    if (booking.equipment) {
      await db.notification.create({
        data: {
          userId: booking.equipment.ownerId,
          type,
          data: payload,
          link: `/owner/bookings/${booking.id}`,
          createdAt: booking.updatedAt,
        },
      });
    }

    if (booking.operator) {
      await db.notification.create({
        data: {
          userId: booking.operator.userId,
          type,
          data: payload,
          link: `/operator/jobs/${booking.id}`,
          createdAt: booking.updatedAt,
        },
      });
    }

    await db.notification.create({
      data: {
        userId: booking.order.companyId,
        type,
        data: payload,
        link: `/company/progress/${booking.id}`,
        createdAt: booking.updatedAt,
      },
    });
  }

  // Settled work matters too: without it, anyone whose jobs have all finished —
  // which includes most operators — opens an empty notification feed. Taken per
  // person rather than platform-wide, so nobody is crowded out by busier users.
  const owners = await db.user.findMany({ where: { roles: { has: "OWNER" } }, select: { id: true } });
  const operators = await db.operatorProfile.findMany({ select: { id: true, userId: true } });

  const payoutPayload = (booking: {
    order: { title: string; company: { name: string; companyProfile: { companyName: string } | null } };
    equipment: { make: string; model: string } | null;
  }) => ({
    orderTitle: booking.order.title,
    companyName:
      booking.order.company.companyProfile?.companyName ?? booking.order.company.name,
    equipmentName: booking.equipment
      ? `${booking.equipment.make} ${booking.equipment.model}`
      : "",
  });

  for (const owner of owners) {
    const recentPaid = await db.booking.findMany({
      where: { status: "PAID", equipment: { ownerId: owner.id } },
      include: {
        order: { include: { company: { include: { companyProfile: true } } } },
        equipment: true,
      },
      orderBy: { paidAt: "desc" },
      take: 4,
    });

    for (const booking of recentPaid) {
      await db.notification.create({
        data: {
          userId: owner.id,
          type: "PAYOUT_RELEASED",
          data: { ...payoutPayload(booking), amount: booking.ownerPayout },
          link: `/owner/bookings/${booking.id}`,
          createdAt: booking.paidAt ?? booking.updatedAt,
          readAt: booking.paidAt,
        },
      });
    }
  }

  for (const operator of operators) {
    const recentPaid = await db.booking.findMany({
      where: { status: "PAID", operatorId: operator.id },
      include: {
        order: { include: { company: { include: { companyProfile: true } } } },
        equipment: true,
      },
      orderBy: { paidAt: "desc" },
      take: 4,
    });

    for (const booking of recentPaid) {
      await db.notification.create({
        data: {
          userId: operator.userId,
          type: "PAYOUT_RELEASED",
          data: { ...payoutPayload(booking), amount: booking.operatorPayout },
          link: `/operator/jobs/${booking.id}`,
          createdAt: booking.paidAt ?? booking.updatedAt,
          readAt: booking.paidAt,
        },
      });
    }
  }

  // Leave each person's newest couple unread, so every persona's bell has a count.
  const withNotifications = await db.notification.groupBy({ by: ["userId"] });
  for (const row of withNotifications) {
    const newest = await db.notification.findMany({
      where: { userId: row.userId },
      orderBy: { createdAt: "desc" },
      take: 2,
      select: { id: true },
    });
    await db.notification.updateMany({
      where: { id: { in: newest.map((n) => n.id) } },
      data: { readAt: null },
    });
  }
}

/**
 * Rewrites every rating aggregate from the reviews the seed actually created.
 *
 * The fixtures carry hand-written rating figures so listings look plausible,
 * but those numbers didn't match the Review rows behind them — so the first
 * real review recomputed the aggregate and the count visibly collapsed. Deriving
 * them here keeps what's displayed equal to what's stored, from the start.
 */
async function recomputeRatings() {
  const grouped = await db.review.groupBy({
    by: ["subjectType", "subjectId"],
    _avg: { rating: true },
    _count: { rating: true },
  });

  for (const row of grouped) {
    const data = {
      ratingAvg: Math.round((row._avg.rating ?? 0) * 100) / 100,
      ratingCount: row._count.rating,
    };

    if (row.subjectType === "EQUIPMENT") {
      await db.equipment.update({ where: { id: row.subjectId }, data });
    } else if (row.subjectType === "OPERATOR") {
      await db.operatorProfile.update({ where: { id: row.subjectId }, data });
    } else {
      await db.companyProfile.update({ where: { id: row.subjectId }, data });
    }
  }

  // Anything nobody reviewed should read as unrated, not as its fixture value.
  const reviewed = new Set(grouped.map((r) => `${r.subjectType}:${r.subjectId}`));

  const equipment = await db.equipment.findMany({ select: { id: true } });
  for (const item of equipment) {
    if (!reviewed.has(`EQUIPMENT:${item.id}`)) {
      await db.equipment.update({
        where: { id: item.id },
        data: { ratingAvg: 0, ratingCount: 0 },
      });
    }
  }

  const operators = await db.operatorProfile.findMany({ select: { id: true } });
  for (const op of operators) {
    if (!reviewed.has(`OPERATOR:${op.id}`)) {
      await db.operatorProfile.update({
        where: { id: op.id },
        data: { ratingAvg: 0, ratingCount: 0 },
      });
    }
  }

  return grouped.length;
}

async function main() {
  console.log("Resetting database…");
  await reset();

  console.log("Seeding platform settings and system accounts…");
  await seedPlatform();

  console.log("Seeding users…");
  await seedUsers();

  console.log("Seeding equipment…");
  await seedEquipment();

  console.log("Seeding availability…");
  await seedAvailability();

  console.log("Seeding job history and ledger…");
  const history = await seedJobHistory();

  console.log("Seeding open orders and live offers…");
  const open = await seedOpenOrders(db);

  console.log("Seeding Operator Academy…");
  const academy = await seedAcademy(db);
  const academyProgress = await seedAcademyProgress(db);

  console.log("Seeding parts store…");
  const store = await seedStore(db);

  console.log("Seeding accounts awaiting verification…");
  const pending = await seedPendingUsers(db);

  console.log("Recomputing ratings from actual reviews…");
  const rated = await recomputeRatings();

  console.log("Seeding notifications…");
  await seedNotifications();

  const counts = {
    users: await db.user.count(),
    equipment: await db.equipment.count(),
    accounts: await db.account.count(),
    bookings: await db.booking.count(),
    ledgerEntries: await db.ledgerEntry.count(),
    notifications: await db.notification.count(),
    ...history,
    openOrders: open.orders,
    liveOffers: open.matches,
    ratedSubjects: rated,
    ...academy,
    ...academyProgress,
    ...store,
    ...pending,
  };
  console.log("Done:", counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
