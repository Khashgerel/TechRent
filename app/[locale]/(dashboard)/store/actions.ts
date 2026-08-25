"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { balanceOf, postTransaction } from "@/lib/escrow/ledger";
import { planPurchase, priceCart, type CartProblem } from "@/lib/store/purchase";
import {
  checkoutSchema,
  serviceRequestSchema,
  type CheckoutInput,
  type ServiceRequestInput,
} from "@/lib/validation/store";

export type CheckoutResult =
  | { ok: true; orderId: string; total: number }
  | { ok: false; error: string; problems?: CartProblem[] };

export type ServiceRequestResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Raised when stock ran out between pricing the cart and taking the money. */
class StockConflictError extends Error {
  constructor(readonly partId: string) {
    super(`Part ${partId} no longer has the requested stock`);
    this.name = "StockConflictError";
  }
}

async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error("Not authorised");
  return session;
}

function toFieldErrors(error: {
  issues: { path: PropertyKey[]; message: string }[];
}) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

/**
 * Buys a basket of parts. The client's cart is treated as a list of intentions,
 * nothing more: prices and stock are re-read here, the ledger transaction is
 * planned from those numbers, and stock, order, money and notification all land
 * in one database transaction so a failure anywhere leaves no half-sale behind.
 */
export async function checkoutAction(
  locale: string,
  input: CheckoutInput,
): Promise<CheckoutResult> {
  const session = await requireUser();

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };
  }
  const data = parsed.data;

  const parts = await db.part.findMany({
    where: { id: { in: data.items.map((item) => item.partId) } },
  });

  const priced = priceCart(parts, data.items);
  if (priced.problems.length > 0) {
    return { ok: false, error: "cart", problems: priced.problems };
  }
  if (priced.lines.length === 0) return { ok: false, error: "emptyCart" };

  const [wallet, revenue, external] = await Promise.all([
    db.account.findUniqueOrThrow({ where: { userId: session.uid } }),
    db.account.findFirstOrThrow({ where: { kind: "PLATFORM_REVENUE" } }),
    db.account.findFirstOrThrow({ where: { kind: "EXTERNAL" } }),
  ]);

  const balance = await balanceOf(db, wallet.id);
  const plan = planPurchase(
    priced.total,
    { buyer: wallet.id, platformRevenue: revenue.id, external: external.id },
    balance,
  );

  try {
    const order = await db.$transaction(async (tx) => {
      for (const line of priced.lines) {
        // Conditional decrement: if the last one sold between pricing and now,
        // no row matches and the whole purchase rolls back.
        const { count } = await tx.part.updateMany({
          where: { id: line.partId, active: true, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });
        if (count !== 1) throw new StockConflictError(line.partId);
      }

      const created = await tx.storeOrder.create({
        data: {
          userId: session.uid,
          status: "PAID",
          totalAmount: priced.total,
          address: data.address,
          note: data.note || null,
          items: {
            create: priced.lines.map((line) => ({
              partId: line.partId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
            })),
          },
        },
      });

      for (const transaction of plan) {
        await postTransaction(tx, { ...transaction, storeOrderId: created.id });
      }

      await tx.notification.create({
        data: {
          userId: session.uid,
          type: "STORE_ORDER_PLACED",
          data: { count: priced.lines.length, amount: priced.total },
          link: "/store/orders",
        },
      });

      return created;
    });

    revalidatePath(`/${locale}/store`);
    revalidatePath(`/${locale}/store/orders`);

    return { ok: true, orderId: order.id, total: priced.total };
  } catch (error) {
    if (error instanceof StockConflictError) {
      return { ok: false, error: "stock" };
    }
    throw error;
  }
}

/**
 * Opens a maintenance request. It lands in the OPEN queue the admin console
 * works through — no money moves until a price is agreed.
 */
export async function createServiceRequestAction(
  locale: string,
  input: ServiceRequestInput,
): Promise<ServiceRequestResult> {
  const session = await requireUser();

  const parsed = serviceRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }
  const data = parsed.data;

  let equipmentId: string | null = null;
  if (data.equipmentId) {
    const owned = await db.equipment.findFirst({
      where: { id: data.equipmentId, ownerId: session.uid },
      select: { id: true },
    });
    if (!owned) {
      return {
        ok: false,
        error: "validation",
        fieldErrors: { equipmentId: "invalid" },
      };
    }
    equipmentId = owned.id;
  }

  const request = await db.serviceRequest.create({
    data: {
      requesterId: session.uid,
      equipmentId,
      category: data.category as never,
      description: data.description,
      preferredAt: data.preferredAt || null,
      status: "OPEN",
    },
  });

  revalidatePath(`/${locale}/store/service`);

  return { ok: true, id: request.id };
}

export async function cancelServiceRequestAction(locale: string, id: string) {
  const session = await requireUser();

  // Only the requester may withdraw, and only while nobody has scheduled it.
  await db.serviceRequest.updateMany({
    where: { id, requesterId: session.uid, status: "OPEN" },
    data: { status: "CANCELLED" },
  });

  revalidatePath(`/${locale}/store/service`);
}
