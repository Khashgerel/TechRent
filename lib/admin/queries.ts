import "server-only";

import { db } from "@/lib/db";
import { balanceOf } from "@/lib/escrow/ledger";
import { ROLE_VALUES } from "@/lib/roles";
import type { Prisma } from "@/lib/generated/prisma/client";
import type {
  Role,
  TransactionType,
  VerificationStatus,
} from "@/lib/generated/prisma/enums";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Last six months as empty buckets, oldest first. */
function monthBuckets(now: Date) {
  const months: { key: string; label: Date; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: monthKey(d), label: d, total: 0 });
  }
  return months;
}

function fillMonths(
  months: { key: string; label: Date; total: number }[],
  entries: { createdAt: Date; amount: number }[],
) {
  const index = new Map(months.map((m, i) => [m.key, i]));
  for (const entry of entries) {
    const i = index.get(monthKey(entry.createdAt));
    if (i !== undefined) months[i].total += entry.amount;
  }
  return months;
}

const LIVE_BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
] as const;

/**
 * The platform's own numbers. Everything about money is read off the ledger
 * rather than off the booking rows, so this page and the accounting can never
 * disagree — the same rule the owner and operator dashboards follow.
 */
export async function getAdminDashboard() {
  const now = new Date();
  const monthStart = startOfMonth(now);

  const [revenue, escrow] = await Promise.all([
    db.account.findFirstOrThrow({ where: { kind: "PLATFORM_REVENUE" } }),
    db.account.findFirstOrThrow({ where: { kind: "ESCROW" } }),
  ]);

  const [
    userTotal,
    roleMemberships,
    pendingUsers,
    suspendedUsers,
    equipmentCount,
    bookingsByStatus,
    gmv,
    openOrders,
    openRequests,
    storeSales,
    lowStock,
    commissionEntries,
    escrowHeld,
    recentBookings,
    recentAudit,
  ] = await Promise.all([
    db.user.count(),
    // Counted by membership rather than by the active role, because one
    // account can hold several — counting the active one would hide an owner
    // who happens to be looking at their operator dashboard.
    Promise.all(
      ROLE_VALUES.map(async (role) => ({
        role,
        count: await db.user.count({ where: { roles: { has: role } } }),
      })),
    ),
    db.user.count({ where: { verification: "PENDING" } }),
    db.user.count({ where: { suspendedAt: { not: null } } }),
    db.equipment.count(),
    db.booking.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
    db.booking.aggregate({
      where: { status: { not: "CANCELLED" } },
      _sum: { totalAmount: true },
    }),
    // An order sits in MATCHED once the engine has scored it and OPEN before
    // that; either way nobody has accepted an offer yet.
    db.order.count({ where: { status: { in: ["OPEN", "MATCHED"] } } }),
    db.serviceRequest.count({ where: { status: "OPEN" } }),
    db.storeOrder.aggregate({
      where: { status: { not: "CANCELLED" } },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    db.part.count({ where: { active: true, stock: { lte: 5 } } }),
    db.ledgerEntry.findMany({
      where: { accountId: revenue.id, amount: { gt: 0 } },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    balanceOf(db, escrow.id),
    db.booking.findMany({
      where: { status: { in: [...LIVE_BOOKING_STATUSES] } },
      include: {
        order: { include: { company: { include: { companyProfile: true } } } },
        equipment: true,
        operator: { include: { user: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.auditLog.findMany({
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const commissionTotal = commissionEntries.reduce((sum, e) => sum + e.amount, 0);
  const commissionMonth = commissionEntries
    .filter((e) => e.createdAt >= monthStart)
    .reduce((sum, e) => sum + e.amount, 0);

  const roleCounts = Object.fromEntries(
    roleMemberships.map((row) => [row.role, row.count]),
  ) as Record<Role, number | undefined>;

  return {
    users: {
      total: userTotal,
      byRole: roleCounts,
      pending: pendingUsers,
      suspended: suspendedUsers,
    },
    equipmentCount,
    bookingsByStatus: bookingsByStatus.map((row) => ({
      status: row.status,
      count: row._count._all,
      total: row._sum.totalAmount ?? 0,
    })),
    liveBookings: bookingsByStatus
      .filter((row) => LIVE_BOOKING_STATUSES.includes(row.status as never))
      .reduce((sum, row) => sum + row._count._all, 0),
    gmv: gmv._sum.totalAmount ?? 0,
    openOrders,
    openRequests,
    storeSales: storeSales._sum.totalAmount ?? 0,
    storeOrderCount: storeSales._count._all,
    lowStock,
    commissionTotal,
    commissionMonth,
    commissionSeries: fillMonths(monthBuckets(now), commissionEntries),
    escrowHeld,
    recentBookings,
    recentAudit,
  };
}

export type AdminDashboard = Awaited<ReturnType<typeof getAdminDashboard>>;

export type UserFilters = {
  query?: string;
  role?: Role;
  verification?: VerificationStatus;
  suspendedOnly?: boolean;
};

export async function listAdminUsers(filters: UserFilters = {}) {
  const where: Prisma.UserWhereInput = {};

  if (filters.role) where.roles = { has: filters.role };
  if (filters.verification) where.verification = filters.verification;
  if (filters.suspendedOnly) where.suspendedAt = { not: null };

  if (filters.query) {
    const contains = { contains: filters.query, mode: "insensitive" as const };
    where.OR = [{ name: contains }, { phone: contains }];
  }

  const users = await db.user.findMany({
    where,
    include: {
      ownerProfile: true,
      operatorProfile: true,
      companyProfile: true,
      wallet: { select: { id: true } },
      _count: { select: { equipment: true, orders: true, storeOrders: true } },
    },
    // Anyone waiting on a decision sorts to the top — this page is a queue
    // before it is a directory.
    orderBy: [{ verification: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  const walletIds = users
    .map((user) => user.wallet?.id)
    .filter((id): id is string => Boolean(id));

  const sums = walletIds.length
    ? await db.ledgerEntry.groupBy({
        by: ["accountId"],
        where: { accountId: { in: walletIds } },
        _sum: { amount: true },
      })
    : [];
  const balances = new Map(sums.map((row) => [row.accountId, row._sum.amount ?? 0]));

  return users.map((user) => ({
    ...user,
    balance: user.wallet ? (balances.get(user.wallet.id) ?? 0) : 0,
  }));
}

export type AdminUser = Awaited<ReturnType<typeof listAdminUsers>>[number];

export type LedgerFilters = {
  type?: TransactionType;
  month?: string;
};

/** Parses "2026-08" into the half-open range that month covers. */
function monthRange(month: string) {
  const [year, m] = month.split("-").map(Number);
  if (!year || !m || m < 1 || m > 12) return null;
  return { gte: new Date(year, m - 1, 1), lt: new Date(year, m, 1) };
}

export async function getLedger(filters: LedgerFilters = {}) {
  const now = new Date();
  const where: Prisma.LedgerTransactionWhereInput = {};

  if (filters.type) where.type = filters.type;
  const range = filters.month ? monthRange(filters.month) : null;
  if (range) where.createdAt = range;

  const revenue = await db.account.findFirstOrThrow({
    where: { kind: "PLATFORM_REVENUE" },
  });

  const [transactions, total, commissionEntries, byType] = await Promise.all([
    db.ledgerTransaction.findMany({
      where,
      include: {
        entries: {
          include: {
            account: {
              select: { kind: true, label: true, user: { select: { name: true } } },
            },
          },
        },
        booking: {
          select: { id: true, order: { select: { title: true } } },
        },
        storeOrder: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    db.ledgerTransaction.count({ where }),
    db.ledgerEntry.findMany({
      where: { accountId: revenue.id, amount: { gt: 0 } },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    db.ledgerTransaction.groupBy({ by: ["type"], _count: { _all: true } }),
  ]);

  const commissionInRange = range
    ? commissionEntries.filter(
        (e) => e.createdAt >= range.gte && e.createdAt < range.lt,
      )
    : commissionEntries;

  return {
    transactions,
    total,
    shown: transactions.length,
    commissionInRange: commissionInRange.reduce((sum, e) => sum + e.amount, 0),
    commissionTotal: commissionEntries.reduce((sum, e) => sum + e.amount, 0),
    commissionSeries: fillMonths(monthBuckets(now), commissionEntries),
    countsByType: Object.fromEntries(
      byType.map((row) => [row.type, row._count._all]),
    ) as Partial<Record<TransactionType, number>>,
    months: monthBuckets(now).map((m) => m.key).reverse(),
  };
}

export type AdminLedger = Awaited<ReturnType<typeof getLedger>>;

export async function getAcademyAdmin() {
  const courses = await db.course.findMany({
    include: {
      _count: {
        select: {
          lessons: true,
          questions: true,
          enrollments: true,
          certificates: true,
        },
      },
    },
    orderBy: [{ level: "asc" }, { titleMn: "asc" }],
  });

  const [passed, attempts] = await Promise.all([
    db.enrollment.count({ where: { status: "COMPLETED" } }),
    db.quizAttempt.count(),
  ]);

  return { courses, passed, attempts };
}

export type AcademyAdmin = Awaited<ReturnType<typeof getAcademyAdmin>>;

export async function getStoreAdmin() {
  const [parts, orders, requests] = await Promise.all([
    db.part.findMany({ orderBy: [{ category: "asc" }, { nameMn: "asc" }] }),
    db.storeOrder.findMany({
      include: {
        user: { select: { name: true, activeRole: true } },
        items: { include: { part: { select: { nameMn: true, nameEn: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    db.serviceRequest.findMany({
      // The open queue is the work; everything else is history.
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 25,
    }),
  ]);

  const requesterIds = [...new Set(requests.map((r) => r.requesterId))];
  const equipmentIds = requests
    .map((r) => r.equipmentId)
    .filter((id): id is string => Boolean(id));

  const [requesters, equipment] = await Promise.all([
    requesterIds.length
      ? db.user.findMany({
          where: { id: { in: requesterIds } },
          select: { id: true, name: true, phone: true },
        })
      : [],
    equipmentIds.length
      ? db.equipment.findMany({
          where: { id: { in: equipmentIds } },
          select: { id: true, make: true, model: true },
        })
      : [],
  ]);

  const requesterById = new Map(requesters.map((u) => [u.id, u]));
  const equipmentById = new Map(equipment.map((e) => [e.id, e]));

  return {
    parts,
    orders,
    requests: requests.map((request) => ({
      ...request,
      requester: requesterById.get(request.requesterId) ?? null,
      equipment: request.equipmentId
        ? (equipmentById.get(request.equipmentId) ?? null)
        : null,
    })),
    stockValue: parts.reduce((sum, part) => sum + part.price * part.stock, 0),
  };
}

export type StoreAdmin = Awaited<ReturnType<typeof getStoreAdmin>>;

export async function getPlatformSettings() {
  return db.platformSettings.findUniqueOrThrow({ where: { id: "singleton" } });
}

export async function getAuditLog(take = 40) {
  return db.auditLog.findMany({
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });
}
