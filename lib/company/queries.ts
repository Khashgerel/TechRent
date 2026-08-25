import "server-only";

import { db } from "@/lib/db";
import { distanceKm } from "@/lib/geo";
import { coordinatesFor } from "@/lib/locations";

export type SearchFilters = {
  category?: string;
  aimag?: string;
  withOperator?: boolean;
  minRate?: number;
  maxRate?: number;
  startDate?: Date;
  endDate?: Date;
  sort?: "relevance" | "priceAsc" | "priceDesc" | "rating";
  query?: string;
};

/**
 * Browse-style search across the whole catalogue. Unlike the matching engine
 * this has no order to score against — it filters and sorts, and only excludes
 * a machine on dates when the searcher actually supplied dates.
 */
export async function searchEquipment(filters: SearchFilters) {
  const equipment = await db.equipment.findMany({
    where: {
      status: "ACTIVE",
      ...(filters.category ? { category: filters.category as never } : {}),
      ...(filters.aimag ? { aimag: filters.aimag } : {}),
      ...(filters.withOperator ? { withOperator: true } : {}),
      ...(filters.minRate || filters.maxRate
        ? {
            dailyRate: {
              ...(filters.minRate ? { gte: filters.minRate } : {}),
              ...(filters.maxRate ? { lte: filters.maxRate } : {}),
            },
          }
        : {}),
      ...(filters.query
        ? {
            OR: [
              { make: { contains: filters.query, mode: "insensitive" as const } },
              { model: { contains: filters.query, mode: "insensitive" as const } },
              {
                description: {
                  contains: filters.query,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    },
    include: {
      owner: { select: { id: true, name: true, ownerProfile: true } },
      bookings:
        filters.startDate && filters.endDate
          ? {
              where: {
                status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"] },
                startDate: { lt: filters.endDate },
                endDate: { gt: filters.startDate },
              },
              select: { id: true },
            }
          : { where: { id: "never" }, select: { id: true } },
      availability:
        filters.startDate && filters.endDate
          ? {
              where: {
                startDate: { lt: filters.endDate },
                endDate: { gt: filters.startDate },
              },
              select: { id: true },
            }
          : { where: { id: "never" }, select: { id: true } },
    },
    take: 120,
  });

  // A date range turns availability into a hard filter.
  const available =
    filters.startDate && filters.endDate
      ? equipment.filter(
          (e) => e.bookings.length === 0 && e.availability.length === 0,
        )
      : equipment;

  const sorted = [...available];
  switch (filters.sort) {
    case "priceAsc":
      sorted.sort((a, b) => a.dailyRate - b.dailyRate);
      break;
    case "priceDesc":
      sorted.sort((a, b) => b.dailyRate - a.dailyRate);
      break;
    case "rating":
      sorted.sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount);
      break;
    default:
      // "Relevance" without an order to compare against means well-reviewed
      // machines that are actually being rented.
      sorted.sort(
        (a, b) =>
          b.ratingAvg * Math.log1p(b.ratingCount) -
          a.ratingAvg * Math.log1p(a.ratingCount),
      );
  }

  return sorted;
}

export type SearchResult = Awaited<ReturnType<typeof searchEquipment>>[number];

export async function getCompanyOrders(companyId: string) {
  return db.order.findMany({
    where: { companyId },
    include: {
      matches: { select: { id: true, status: true } },
      bookings: {
        include: {
          equipment: true,
          operator: { include: { user: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCompanyOrder(orderId: string, companyId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      company: { include: { companyProfile: true } },
      matches: {
        include: {
          equipment: {
            include: { owner: { select: { name: true, ownerProfile: true } } },
          },
          operator: { include: { user: { select: { name: true } } } },
        },
        orderBy: { score: "desc" },
      },
      bookings: {
        include: {
          equipment: true,
          operator: { include: { user: true } },
        },
      },
    },
  });

  if (!order || order.companyId !== companyId) return null;
  return order;
}

export type CompanyOrder = NonNullable<Awaited<ReturnType<typeof getCompanyOrder>>>;

export async function getCompanyDashboard(companyId: string) {
  const [orders, bookings, profile] = await Promise.all([
    db.order.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { matches: { select: { id: true, status: true } } },
    }),
    db.booking.findMany({
      where: { order: { companyId } },
      include: {
        equipment: true,
        order: true,
        operator: { include: { user: true } },
      },
      orderBy: { startDate: "desc" },
    }),
    db.companyProfile.findUnique({ where: { userId: companyId } }),
  ]);

  const active = bookings.filter((b) =>
    ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"].includes(b.status),
  );

  const spend = bookings
    .filter((b) => b.status === "PAID")
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const openOrders = orders.filter((o) =>
    ["DRAFT", "OPEN", "MATCHED"].includes(o.status),
  );

  return { orders, bookings, active, spend, openOrders, profile };
}

/** Nearby machines for the map, given a place rather than coordinates. */
export function withDistanceFrom(
  results: { lat: number; lng: number }[],
  aimag: string,
  district?: string | null,
) {
  const origin = coordinatesFor(aimag, district);
  return results.map((r) => ({
    ...r,
    distanceKm: Math.round(distanceKm(origin, { lat: r.lat, lng: r.lng }) * 10) / 10,
  }));
}
