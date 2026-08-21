import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { EQUIPMENT } from "./seed/equipment";
import { jitter, PLACES, type Place } from "./seed/locations";
import { ADMINS, COMPANIES, OPERATORS, OWNERS } from "./seed/people";
import { seedHistory } from "./seed/history";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

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
    db.otpCode.deleteMany(),
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

  for (const owner of OWNERS) {
    const p = place(owner.place);
    await db.user.create({
      data: {
        phone: owner.phone,
        name: owner.name,
        role: "OWNER",
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

  for (const op of OPERATORS) {
    const p = place(op.place);
    await db.user.create({
      data: {
        phone: op.phone,
        name: op.name,
        role: "OPERATOR",
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
        role: "COMPANY",
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
        role: "ADMIN",
        ...verified,
        wallet: { create: { kind: "USER_WALLET", label: admin.name } },
      },
    });
  }
}

async function seedEquipment() {
  const owners = await db.user.findMany({ where: { role: "OWNER" } });
  const byPhone = new Map(owners.map((o) => [o.phone, o.id]));

  for (const [index, item] of EQUIPMENT.entries()) {
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
