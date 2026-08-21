import "server-only";

import { db } from "@/lib/db";

const DAY_MS = 1000 * 60 * 60 * 24;

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Days of [aStart, aEnd] that fall inside [bStart, bEnd]. */
function overlapDays(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  const start = Math.max(aStart.getTime(), bStart.getTime());
  const end = Math.min(aEnd.getTime(), bEnd.getTime());
  if (end <= start) return 0;
  return (end - start) / DAY_MS;
}

export type OwnerDashboard = Awaited<ReturnType<typeof getOwnerDashboard>>;

export async function getOwnerDashboard(ownerId: string) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const windowStart = new Date(now.getTime() - 30 * DAY_MS);

  const [equipment, wallet] = await Promise.all([
    db.equipment.findMany({
      where: { ownerId },
      orderBy: { createdAt: "asc" },
    }),
    db.account.findUnique({ where: { userId: ownerId } }),
  ]);

  const equipmentIds = equipment.map((e) => e.id);

  const bookings = equipmentIds.length
    ? await db.booking.findMany({
        where: { equipmentId: { in: equipmentIds } },
        include: {
          order: {
            include: { company: { include: { companyProfile: true } } },
          },
          equipment: true,
          operator: { include: { user: true } },
        },
        orderBy: { startDate: "desc" },
      })
    : [];

  const activeBookings = bookings.filter((b) =>
    ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"].includes(b.status),
  );

  // Earnings come off the ledger rather than the booking rows, so the dashboard
  // and the accounting can never disagree.
  const entries = wallet
    ? await db.ledgerEntry.findMany({
        where: { accountId: wallet.id, amount: { gt: 0 } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const lifetimeRevenue = entries.reduce((sum, e) => sum + e.amount, 0);
  const monthRevenue = entries
    .filter((e) => e.createdAt >= monthStart)
    .reduce((sum, e) => sum + e.amount, 0);

  // Last six months, oldest first.
  const months: { key: string; label: Date; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: monthKey(d), label: d, total: 0 });
  }
  const monthIndex = new Map(months.map((m, i) => [m.key, i]));
  for (const entry of entries) {
    const idx = monthIndex.get(monthKey(entry.createdAt));
    if (idx !== undefined) months[idx].total += entry.amount;
  }

  // Utilization: share of the last 30 days each machine spent on a booking.
  const perEquipment = equipment.map((item) => {
    const bookedDays = bookings
      .filter(
        (b) =>
          b.equipmentId === item.id &&
          !["CANCELLED"].includes(b.status),
      )
      .reduce(
        (sum, b) => sum + overlapDays(b.startDate, b.endDate, windowStart, now),
        0,
      );

    return {
      id: item.id,
      name: `${item.make} ${item.model}`,
      category: item.category,
      status: item.status,
      utilization: Math.min(100, Math.round((bookedDays / 30) * 100)),
    };
  });

  const utilization = perEquipment.length
    ? Math.round(
        perEquipment.reduce((s, e) => s + e.utilization, 0) / perEquipment.length,
      )
    : 0;

  return {
    equipment,
    equipmentCount: equipment.length,
    activeCount: activeBookings.length,
    utilization,
    perEquipment,
    monthRevenue,
    lifetimeRevenue,
    revenueSeries: months,
    activeBookings: activeBookings.slice(0, 6),
    recentBookings: bookings.slice(0, 8),
  };
}

export type OwnerEarnings = Awaited<ReturnType<typeof getOwnerEarnings>>;

export async function getOwnerEarnings(ownerId: string) {
  const now = new Date();
  const monthStart = startOfMonth(now);

  const wallet = await db.account.findUnique({ where: { userId: ownerId } });
  if (!wallet) {
    return {
      available: 0,
      inEscrow: 0,
      monthRevenue: 0,
      lifetimeRevenue: 0,
      transactions: [],
      byEquipment: [],
    };
  }

  const entries = await db.ledgerEntry.findMany({
    where: { accountId: wallet.id },
    include: {
      transaction: {
        include: {
          booking: {
            include: {
              equipment: true,
              order: {
                include: { company: { include: { companyProfile: true } } },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const available = entries.reduce((sum, e) => sum + e.amount, 0);
  const credits = entries.filter((e) => e.amount > 0);
  const lifetimeRevenue = credits.reduce((sum, e) => sum + e.amount, 0);
  const monthRevenue = credits
    .filter((e) => e.createdAt >= monthStart)
    .reduce((sum, e) => sum + e.amount, 0);

  // Money the client has already funded but that hasn't been released yet.
  const pending = await db.booking.findMany({
    where: {
      equipment: { ownerId },
      status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] },
    },
    select: { ownerPayout: true },
  });
  const inEscrow = pending.reduce((sum, b) => sum + b.ownerPayout, 0);

  const byEquipment = new Map<string, { name: string; total: number }>();
  for (const entry of credits) {
    const equipment = entry.transaction.booking?.equipment;
    if (!equipment) continue;
    const key = equipment.id;
    const current = byEquipment.get(key) ?? {
      name: `${equipment.make} ${equipment.model}`,
      total: 0,
    };
    current.total += entry.amount;
    byEquipment.set(key, current);
  }

  return {
    available,
    inEscrow,
    monthRevenue,
    lifetimeRevenue,
    transactions: entries.slice(0, 40),
    byEquipment: [...byEquipment.values()].sort((a, b) => b.total - a.total),
  };
}

export async function getOwnerEquipment(ownerId: string) {
  return db.equipment.findMany({
    where: { ownerId },
    include: {
      _count: { select: { bookings: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getOwnerCalendar(ownerId: string) {
  const equipment = await db.equipment.findMany({
    where: { ownerId },
    select: { id: true, make: true, model: true, category: true },
    orderBy: { createdAt: "asc" },
  });

  const equipmentIds = equipment.map((e) => e.id);
  if (!equipmentIds.length) return { equipment, bookings: [], blocks: [] };

  const [bookings, blocks] = await Promise.all([
    db.booking.findMany({
      where: {
        equipmentId: { in: equipmentIds },
        status: { notIn: ["CANCELLED"] },
      },
      select: {
        id: true,
        equipmentId: true,
        startDate: true,
        endDate: true,
        status: true,
        order: { select: { title: true } },
      },
    }),
    db.availabilityBlock.findMany({
      where: { equipmentId: { in: equipmentIds } },
      orderBy: { startDate: "asc" },
    }),
  ]);

  return { equipment, bookings, blocks };
}

export async function getOwnerBookings(ownerId: string) {
  return db.booking.findMany({
    where: { equipment: { ownerId } },
    include: {
      equipment: true,
      order: { include: { company: { include: { companyProfile: true } } } },
      operator: { include: { user: true } },
    },
    orderBy: { startDate: "desc" },
  });
}
