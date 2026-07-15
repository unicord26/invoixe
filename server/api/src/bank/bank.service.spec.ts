import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@invoixe/db";
import type { AuthUser } from "../lib/auth";

const getUserBusinessId = vi.fn(async (_user: AuthUser) => "biz-1");
vi.mock("../lib/business", () => ({ getUserBusinessId: (u: AuthUser) => getUserBusinessId(u) }));

const { BankService } = await import("./bank.controller");

const user: AuthUser = { id: "u1", email: "a@b.com" };

function mockPrisma() {
  return {
    bankAccount: {
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => ({ id: "acct-1" })),
      create: vi.fn(async ({ data }: any) => ({ id: "acct-1", ...data })),
    },
    bankEntry: {
      groupBy: vi.fn(async () => []),
      create: vi.fn(async () => ({ id: "e1" })),
      createMany: vi.fn(async () => ({ count: 2 })),
    },
  } as unknown as PrismaClient & Record<string, any>;
}

describe("BankService — money movement", () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let svc: InstanceType<typeof BankService>;

  beforeEach(() => {
    prisma = mockPrisma();
    svc = new BankService(prisma);
  });

  it("balance = opening + summed entries", async () => {
    (prisma.bankAccount.findMany as any).mockResolvedValue([
      { id: "a1", openingBalance: 1000 },
      { id: "a2", openingBalance: 0 },
    ]);
    (prisma.bankEntry.groupBy as any).mockResolvedValue([
      { accountId: "a1", _sum: { amount: 500 } },
      { accountId: "a2", _sum: { amount: -200 } },
    ]);
    const rows = (await svc.accounts(user)) as any[];
    expect(rows.find((r) => r.id === "a1").balance).toBe(1500);
    expect(rows.find((r) => r.id === "a2").balance).toBe(-200);
  });

  it("an account with no entries keeps its opening balance", async () => {
    (prisma.bankAccount.findMany as any).mockResolvedValue([{ id: "a1", openingBalance: 700 }]);
    const rows = (await svc.accounts(user)) as any[];
    expect(rows[0].balance).toBe(700);
  });

  it("withdraw is stored as a negative amount", async () => {
    await svc.addEntry(user, "acct-1", { amount: 500, kind: "withdraw" });
    expect((prisma.bankEntry.create as any).mock.calls[0][0].data.amount).toBe(-500);
  });

  it("withdraw of a negative number cannot flip into a deposit", async () => {
    await svc.addEntry(user, "acct-1", { amount: -500, kind: "withdraw" });
    expect((prisma.bankEntry.create as any).mock.calls[0][0].data.amount).toBe(-500);
  });

  it("deposit is stored positive", async () => {
    await svc.addEntry(user, "acct-1", { amount: 500, kind: "deposit" });
    expect((prisma.bankEntry.create as any).mock.calls[0][0].data.amount).toBe(500);
  });

  it("rejects fractional paise and zero amounts", async () => {
    for (const amount of [0, 1.5, NaN, "abc"]) {
      await expect(svc.addEntry(user, "acct-1", { amount } as never)).rejects.toMatchObject({
        response: { error: "invalid_amount" },
      });
    }
  });

  it("refuses an entry against another firm's account", async () => {
    (prisma.bankAccount.findFirst as any).mockResolvedValue(null);
    await expect(svc.addEntry(user, "not-mine", { amount: 100, kind: "deposit" })).rejects.toMatchObject({
      response: { error: "not_found" },
    });
  });

  it("transfer writes paired entries that net to zero", async () => {
    (prisma.bankAccount.findMany as any).mockResolvedValue([{ id: "a1" }, { id: "a2" }]);
    await svc.transfer(user, { fromId: "a1", toId: "a2", amount: 900 });
    const rows = (prisma.bankEntry.createMany as any).mock.calls[0][0].data;
    expect(rows.reduce((s: number, r: any) => s + r.amount, 0)).toBe(0);
    expect(rows.find((r: any) => r.accountId === "a1").amount).toBe(-900);
    expect(rows.find((r: any) => r.accountId === "a2").amount).toBe(900);
  });

  it("refuses a transfer to the same account", async () => {
    await expect(svc.transfer(user, { fromId: "a1", toId: "a1", amount: 100 })).rejects.toMatchObject({
      response: { error: "invalid_transfer" },
    });
  });

  it("refuses a transfer when an account is not in the caller's firm", async () => {
    // Only one of the two ids resolves within the business.
    (prisma.bankAccount.findMany as any).mockResolvedValue([{ id: "a1" }]);
    await expect(svc.transfer(user, { fromId: "a1", toId: "someone-elses", amount: 100 })).rejects.toMatchObject({
      response: { error: "account_not_found" },
    });
  });

  it("creating an account requires a name and scopes it to the firm", async () => {
    await expect(svc.createAccount(user, { name: " " })).rejects.toMatchObject({
      response: { error: "name_required" },
    });
    await svc.createAccount(user, { name: "Cash", type: "nonsense", openingBalance: 1.5 });
    const d = (prisma.bankAccount.create as any).mock.calls[0][0].data;
    expect(d.businessId).toBe("biz-1");
    expect(d.type).toBe("bank"); // unknown type falls back
    expect(d.openingBalance).toBe(0); // non-integer paise rejected
  });
});
