import type {
  ServiceRequestStatus,
  StoreOrderStatus,
} from "../generated/prisma/enums";

/**
 * What the admin console is allowed to do next with a store order or a service
 * request. Kept pure and outside the actions module so the buttons and the
 * server agree on one set of rules — the client hides what the server refuses.
 */

const ORDER_FLOW: Record<StoreOrderStatus, StoreOrderStatus[]> = {
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const REQUEST_FLOW: Record<ServiceRequestStatus, ServiceRequestStatus[]> = {
  OPEN: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["DONE", "CANCELLED"],
  DONE: [],
  CANCELLED: [],
};

export function nextOrderStatuses(status: StoreOrderStatus) {
  return ORDER_FLOW[status];
}

export function nextRequestStatuses(status: ServiceRequestStatus) {
  return REQUEST_FLOW[status];
}

/**
 * Cancelling an order whose money already moved is the transition that refunds.
 * A `PENDING` order was never charged, so cancelling it moves nothing.
 */
export function refundsOnCancel(status: StoreOrderStatus) {
  return status === "PAID";
}
