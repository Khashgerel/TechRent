import "server-only";

import { db } from "@/lib/db";
import { walletSummary } from "@/lib/escrow/ledger";
import type { EquipmentCategory, PartCategory } from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";

export type PartFilters = {
  query?: string;
  category?: PartCategory;
  /** Only parts that fit this machine category (universal parts always fit). */
  fits?: EquipmentCategory;
  inStockOnly?: boolean;
  sort?: "relevance" | "priceAsc" | "priceDesc" | "name";
};

const SORTS: Record<
  NonNullable<PartFilters["sort"]>,
  Prisma.PartOrderByWithRelationInput[]
> = {
  relevance: [{ category: "asc" }, { nameMn: "asc" }],
  priceAsc: [{ price: "asc" }],
  priceDesc: [{ price: "desc" }],
  name: [{ nameMn: "asc" }],
};

export async function listParts(filters: PartFilters = {}) {
  const where: Prisma.PartWhereInput = { active: true };

  if (filters.category) where.category = filters.category;
  if (filters.inStockOnly) where.stock = { gt: 0 };

  if (filters.fits) {
    // A part with no declared compatibility is universal — oils, grease, gloves.
    where.OR = [
      { compatibleWith: { isEmpty: true } },
      { compatibleWith: { has: filters.fits } },
    ];
  }

  if (filters.query) {
    const contains = { contains: filters.query, mode: "insensitive" as const };
    where.AND = [
      {
        OR: [{ nameMn: contains }, { nameEn: contains }, { sku: contains }],
      },
    ];
  }

  return db.part.findMany({
    where,
    orderBy: SORTS[filters.sort ?? "relevance"],
  });
}

export type CataloguePart = Awaited<ReturnType<typeof listParts>>[number];

/**
 * Every sellable part, in the shape the cart needs to draw a line. The cart
 * outlives the filters — a part added before narrowing the catalogue must still
 * show and still be charged — so it is resolved against this list, not the
 * filtered one.
 */
export async function listCartParts() {
  return db.part.findMany({
    where: { active: true },
    select: {
      id: true,
      sku: true,
      nameMn: true,
      nameEn: true,
      price: true,
      stock: true,
    },
  });
}

export type CartPart = Awaited<ReturnType<typeof listCartParts>>[number];

export async function getStoreOrders(userId: string) {
  return db.storeOrder.findMany({
    where: { userId },
    include: { items: { include: { part: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export type StoreOrderWithItems = Awaited<
  ReturnType<typeof getStoreOrders>
>[number];

export async function getServiceRequests(requesterId: string) {
  const requests = await db.serviceRequest.findMany({
    where: { requesterId },
    orderBy: { createdAt: "desc" },
  });

  // `ServiceRequest.equipmentId` is a loose reference — the machine may have
  // been delisted since — so the name is looked up separately and may be null.
  const ids = requests.map((r) => r.equipmentId).filter((id): id is string => !!id);
  const equipment = ids.length
    ? await db.equipment.findMany({
        where: { id: { in: ids } },
        select: { id: true, make: true, model: true },
      })
    : [];
  const byId = new Map(equipment.map((e) => [e.id, e]));

  return requests.map((request) => ({
    ...request,
    equipment: request.equipmentId ? (byId.get(request.equipmentId) ?? null) : null,
  }));
}

export type ServiceRequestRow = Awaited<
  ReturnType<typeof getServiceRequests>
>[number];

/** The wallet figure the checkout panel shows, plus what this user has spent. */
export async function getStoreWallet(userId: string) {
  const [wallet, spent, openRequests] = await Promise.all([
    walletSummary(db, userId),
    db.storeOrder.aggregate({
      where: { userId, status: { not: "CANCELLED" } },
      _sum: { totalAmount: true },
    }),
    db.serviceRequest.count({ where: { requesterId: userId, status: "OPEN" } }),
  ]);

  return {
    available: wallet.available,
    spent: spent._sum.totalAmount ?? 0,
    openRequests,
  };
}

/**
 * Pre-fills the delivery address from whichever profile the account has, so a
 * demo checkout is one click rather than a typing exercise.
 */
export async function defaultAddressFor(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      ownerProfile: { select: { aimag: true, district: true } },
      operatorProfile: { select: { aimag: true, district: true } },
      companyProfile: { select: { aimag: true, district: true } },
    },
  });

  const place =
    user?.companyProfile ?? user?.ownerProfile ?? user?.operatorProfile ?? null;
  if (!place) return "";

  return [place.aimag, place.district].filter(Boolean).join(", ");
}

/** The machines an owner can attach to a service request. */
export async function getOwnEquipment(ownerId: string) {
  return db.equipment.findMany({
    where: { ownerId },
    select: { id: true, make: true, model: true, category: true },
    orderBy: [{ make: "asc" }, { model: "asc" }],
  });
}
