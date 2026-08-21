import { describe, expect, it, vi } from "vitest";
import {
  postTransaction,
  UnbalancedTransactionError,
  type LedgerClient,
} from "../ledger";

/** Just enough of the client to observe what postTransaction would write. */
function fakeClient() {
  const create = vi.fn().mockResolvedValue({ id: "tx_1", entries: [] });
  return {
    client: { ledgerTransaction: { create } } as unknown as LedgerClient,
    create,
  };
}

describe("postTransaction", () => {
  it("writes a transaction whose entries sum to zero", async () => {
    const { client, create } = fakeClient();

    await postTransaction(client, {
      type: "RELEASE",
      entries: [
        { accountId: "escrow", amount: -1_000_000 },
        { accountId: "owner", amount: 675_000 },
        { accountId: "operator", amount: 225_000 },
        { accountId: "revenue", amount: 100_000 },
      ],
    });

    expect(create).toHaveBeenCalledOnce();
    const entries = create.mock.calls[0][0].data.entries.create;
    expect(entries.reduce((s: number, e: { amount: number }) => s + e.amount, 0)).toBe(0);
  });

  it("refuses an unbalanced transaction rather than writing it", async () => {
    const { client, create } = fakeClient();

    await expect(
      postTransaction(client, {
        type: "RELEASE",
        entries: [
          { accountId: "escrow", amount: -1_000_000 },
          { accountId: "owner", amount: 900_000 },
        ],
      }),
    ).rejects.toBeInstanceOf(UnbalancedTransactionError);

    expect(create).not.toHaveBeenCalled();
  });

  it("reports how far out of balance the entries were", async () => {
    const { client } = fakeClient();

    await expect(
      postTransaction(client, {
        type: "TOPUP",
        entries: [
          { accountId: "external", amount: -500 },
          { accountId: "wallet", amount: 400 },
        ],
      }),
    ).rejects.toThrow("sum to -100");
  });

  it("refuses a single-sided transaction", async () => {
    const { client } = fakeClient();

    await expect(
      postTransaction(client, {
        type: "TOPUP",
        entries: [{ accountId: "wallet", amount: 0 }],
      }),
    ).rejects.toThrow("at least two entries");
  });
});
