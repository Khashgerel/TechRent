import type { Role } from "@/lib/generated/prisma/enums";

/**
 * Every role, in the order the product talks about them.
 *
 * An account holds a set of these rather than one, so anything that iterates
 * roles — counting members, building the sidebar, offering a switcher — reads
 * the order from here instead of hard-coding its own.
 */
export const ROLE_VALUES: Role[] = ["OWNER", "OPERATOR", "COMPANY", "ADMIN"];

/** The roles a visitor holds, in the canonical order rather than insertion order. */
export function orderedRoles(roles: Role[]): Role[] {
  return ROLE_VALUES.filter((role) => roles.includes(role));
}

/**
 * ADMIN is a staff role: it is never mixed into a marketplace account, and an
 * admin never picks up owner or operator areas by accident.
 */
export function isStaff(roles: Role[]) {
  return roles.includes("ADMIN");
}
