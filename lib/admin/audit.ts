/**
 * Audit rows store a machine-readable action like `user.verification`. The
 * message catalogs can't nest a key containing dots, so the lookup swaps them
 * for underscores; an action with no translation falls back to its raw string
 * rather than rendering a missing-key error.
 */
export function auditMessageKey(action: string) {
  return `admin.actions.${action.replace(/\./g, "_")}`;
}
