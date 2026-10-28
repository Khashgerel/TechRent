"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActorRole } from "@/lib/auth/guards";
import { postTransaction } from "@/lib/escrow/ledger";
import {
  nextOrderStatuses,
  nextRequestStatuses,
  refundsOnCancel,
} from "@/lib/admin/flow";
import { planRefund } from "@/lib/store/purchase";
import {
  partUpdateSchema,
  settingsSchema,
  type PartUpdateInput,
  type SettingsInput,
} from "@/lib/validation/admin";
import type { Prisma } from "@/lib/generated/prisma/client";
import type {
  ServiceRequestStatus,
  StoreOrderStatus,
  VerificationStatus,
} from "@/lib/generated/prisma/enums";

export type AdminResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

async function requireAdmin() {
  return requireActorRole("ADMIN");
}

/**
 * Every administrative change is written to `AuditLog` in the same transaction
 * as the change itself, so the console can always answer "who did this".
 */
function audit(
  tx: Prisma.TransactionClient,
  actorId: string,
  action: string,
  target: { type: string; id: string },
  meta?: Prisma.InputJsonValue,
) {
  return tx.auditLog.create({
    data: {
      actorId,
      action,
      targetType: target.type,
      targetId: target.id,
      ...(meta === undefined ? {} : { meta }),
    },
  });
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

// ─────────────────────────── Users ───────────────────────────

export async function setVerificationAction(
  locale: string,
  userId: string,
  verification: VerificationStatus,
) {
  const session = await requireAdmin();

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, verification: true },
  });

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        verification,
        verifiedAt: verification === "VERIFIED" ? new Date() : null,
      },
    });

    // Approval is news the account holder needs; a rejection is handled by a
    // human calling them, so it doesn't fire a notification.
    if (verification === "VERIFIED") {
      await tx.notification.create({
        data: {
          userId,
          type: "ACCOUNT_VERIFIED",
          data: {},
          link: "/notifications",
        },
      });
    }

    await audit(tx, session.uid, "user.verification", { type: "User", id: userId }, {
      from: user.verification,
      to: verification,
    });
  });

  revalidatePath(`/${locale}/admin/users`);
  revalidatePath(`/${locale}/admin`);
}

export async function setSuspendedAction(
  locale: string,
  userId: string,
  suspended: boolean,
): Promise<AdminResult> {
  const session = await requireAdmin();

  // Locking yourself out mid-demo is not a recoverable mistake.
  if (userId === session.uid) return { ok: false, error: "selfSuspend" };

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { suspendedAt: suspended ? new Date() : null },
    });

    await audit(
      tx,
      session.uid,
      suspended ? "user.suspend" : "user.reinstate",
      { type: "User", id: userId },
    );
  });

  revalidatePath(`/${locale}/admin/users`);
  revalidatePath(`/${locale}/admin`);

  return { ok: true };
}

// ─────────────────────────── Settings ───────────────────────────

export async function updateSettingsAction(
  locale: string,
  input: SettingsInput,
): Promise<AdminResult> {
  const session = await requireAdmin();

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }
  const data = parsed.data;

  const before = await db.platformSettings.findUniqueOrThrow({
    where: { id: "singleton" },
  });

  const next = {
    commissionRate: data.commissionPercent / 100,
    depositPercent: data.depositPercent / 100,
    operatorShare: data.operatorSharePercent / 100,
    levelUpIntermediate: data.levelUpIntermediate,
    levelUpAdvanced: data.levelUpAdvanced,
    pointsPerJob: data.pointsPerJob,
    pointsPerRating: data.pointsPerRating,
  };

  await db.$transaction(async (tx) => {
    await tx.platformSettings.update({ where: { id: "singleton" }, data: next });

    await audit(tx, session.uid, "settings.update", {
      type: "PlatformSettings",
      id: "singleton",
    }, {
      commissionRate: [before.commissionRate, next.commissionRate],
      depositPercent: [before.depositPercent, next.depositPercent],
      operatorShare: [before.operatorShare, next.operatorShare],
    });
  });

  // Settings feed matching and escrow, so anything quoting money is now stale.
  revalidatePath(`/${locale}/admin/settings`);
  revalidatePath(`/${locale}/admin`);

  return { ok: true };
}

// ─────────────────────────── Academy ───────────────────────────

export async function setCoursePublishedAction(
  locale: string,
  courseId: string,
  published: boolean,
) {
  const session = await requireAdmin();

  await db.$transaction(async (tx) => {
    await tx.course.update({ where: { id: courseId }, data: { published } });
    await audit(
      tx,
      session.uid,
      published ? "course.publish" : "course.unpublish",
      { type: "Course", id: courseId },
    );
  });

  revalidatePath(`/${locale}/admin/academy`);
  revalidatePath(`/${locale}/operator/academy`);
}

// ─────────────────────────── Store ───────────────────────────

export async function updatePartAction(
  locale: string,
  partId: string,
  input: PartUpdateInput,
): Promise<AdminResult> {
  const session = await requireAdmin();

  const parsed = partUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }
  const data = parsed.data;

  const before = await db.part.findUniqueOrThrow({
    where: { id: partId },
    select: { price: true, stock: true, active: true },
  });

  await db.$transaction(async (tx) => {
    await tx.part.update({ where: { id: partId }, data });
    await audit(tx, session.uid, "part.update", { type: "Part", id: partId }, {
      price: [before.price, data.price],
      stock: [before.stock, data.stock],
      active: [before.active, data.active],
    });
  });

  revalidatePath(`/${locale}/admin/store`);
  revalidatePath(`/${locale}/store`);

  return { ok: true };
}

/**
 * Advances a store order. Cancelling a paid order is the one transition that
 * moves money: the stock goes back on the shelf and the buyer is refunded out
 * of platform revenue, in the same transaction as the status change.
 */
export async function setStoreOrderStatusAction(
  locale: string,
  orderId: string,
  status: StoreOrderStatus,
): Promise<AdminResult> {
  const session = await requireAdmin();

  const order = await db.storeOrder.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true },
  });

  if (!nextOrderStatuses(order.status).includes(status)) {
    return { ok: false, error: "badTransition" };
  }

  const refunding = status === "CANCELLED" && refundsOnCancel(order.status);

  const [wallet, revenue, external] = refunding
    ? await Promise.all([
        db.account.findUniqueOrThrow({ where: { userId: order.userId } }),
        db.account.findFirstOrThrow({ where: { kind: "PLATFORM_REVENUE" } }),
        db.account.findFirstOrThrow({ where: { kind: "EXTERNAL" } }),
      ])
    : [null, null, null];

  await db.$transaction(async (tx) => {
    await tx.storeOrder.update({ where: { id: orderId }, data: { status } });

    if (refunding && wallet && revenue && external) {
      for (const item of order.items) {
        await tx.part.update({
          where: { id: item.partId },
          data: { stock: { increment: item.quantity } },
        });
      }

      const plan = planRefund(order.totalAmount, {
        buyer: wallet.id,
        platformRevenue: revenue.id,
        external: external.id,
      });

      for (const transaction of plan) {
        await postTransaction(tx, { ...transaction, storeOrderId: order.id });
      }
    }

    await audit(tx, session.uid, "storeOrder.status", {
      type: "StoreOrder",
      id: orderId,
    }, { from: order.status, to: status });
  });

  revalidatePath(`/${locale}/admin/store`);
  revalidatePath(`/${locale}/store/orders`);

  return { ok: true };
}

export async function setServiceRequestStatusAction(
  locale: string,
  requestId: string,
  status: ServiceRequestStatus,
): Promise<AdminResult> {
  const session = await requireAdmin();

  const request = await db.serviceRequest.findUniqueOrThrow({
    where: { id: requestId },
    select: { status: true },
  });

  if (!nextRequestStatuses(request.status).includes(status)) {
    return { ok: false, error: "badTransition" };
  }

  await db.$transaction(async (tx) => {
    await tx.serviceRequest.update({ where: { id: requestId }, data: { status } });
    await audit(tx, session.uid, "serviceRequest.status", {
      type: "ServiceRequest",
      id: requestId,
    }, { from: request.status, to: status });
  });

  revalidatePath(`/${locale}/admin/store`);
  revalidatePath(`/${locale}/store/service`);

  return { ok: true };
}

// ───────────────────────── Equipment review ─────────────────────────

/**
 * Approves or rejects a machine waiting in `PENDING_REVIEW`.
 *
 * That status has existed since the first migration with nothing able to clear
 * it, so listings from unverified owners would have sat invisible forever.
 * This is the queue that lets them through.
 */
export async function reviewEquipmentAction(
  locale: string,
  equipmentId: string,
  decision: "ACTIVE" | "INACTIVE",
) {
  const session = await requireAdmin();

  const equipment = await db.equipment.findUnique({
    where: { id: equipmentId },
    select: { id: true, status: true, make: true, model: true, ownerId: true },
  });

  if (!equipment) return { ok: false as const, error: "notFound" };
  if (equipment.status !== "PENDING_REVIEW") {
    return { ok: false as const, error: "notPending" };
  }

  await db.$transaction(async (tx) => {
    await tx.equipment.update({
      where: { id: equipmentId },
      data: { status: decision },
    });

    await audit(
      tx,
      session.uid,
      decision === "ACTIVE" ? "equipment.approve" : "equipment.reject",
      { type: "Equipment", id: equipmentId },
      { name: `${equipment.make} ${equipment.model}` },
    );
  });

  revalidatePath(`/${locale}/admin/equipment`);
  revalidatePath(`/${locale}/admin`);
  return { ok: true as const };
}
