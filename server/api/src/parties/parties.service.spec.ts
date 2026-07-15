import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@invoixe/db";
import type { AuthUser } from "../lib/auth";

// getUserBusinessId resolves the caller's firm from the DB; stub that boundary so
// these tests assert how the *service* uses the id.
const getUserBusinessId = vi.fn(async (_user: AuthUser) => "biz-1");
vi.mock("../lib/business", () => ({ getUserBusinessId: (u: AuthUser) => getUserBusinessId(u) }));

const { PartiesService } = await import("./parties.service");

const user: AuthUser = { id: "u1", email: "a@b.com" };

function mockPrisma() {
  return {
    party: {
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => null),
      findUnique: vi.fn(async () => ({ id: "p1" })),
      create: vi.fn(async ({ data }: any) => ({ id: "p1", ...data })),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    transaction: { findMany: vi.fn(async () => []) },
  } as unknown as PrismaClient & Record<string, any>;
}

describe("PartiesService — tenant scoping", () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let svc: InstanceType<typeof PartiesService>;

  beforeEach(() => {
    prisma = mockPrisma();
    svc = new PartiesService(prisma);
    getUserBusinessId.mockClear();
  });

  it("list scopes to the business and hides soft-deleted rows", async () => {
    await svc.list("biz-1");
    expect(prisma.party.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { businessId: "biz-1", deletedAt: null } })
    );
  });

  it("create forces businessId from the session, overriding any client value", async () => {
    // Even if a businessId slipped through validation, the session's must win.
    await svc.create(user, { name: "X", businessId: "attacker-biz" } as never);
    const arg = (prisma.party.create as any).mock.calls[0][0];
    expect(arg.data.businessId).toBe("biz-1");
  });

  it("update is scoped so another firm's id cannot be patched", async () => {
    await svc.update(user, "p1", { name: "Y" } as never);
    expect(prisma.party.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "p1", businessId: "biz-1", deletedAt: null } })
    );
  });

  it("update reports not_found (never 500) when the row belongs to someone else", async () => {
    (prisma.party.updateMany as any).mockResolvedValue({ count: 0 });
    await expect(svc.update(user, "other-firm-party", { name: "Y" } as never)).rejects.toMatchObject({
      response: { error: "not_found" },
    });
  });

  it("remove soft-deletes rather than hard-deleting", async () => {
    await svc.remove(user, "p1");
    const arg = (prisma.party.updateMany as any).mock.calls[0][0];
    expect(arg.data.deletedAt).toBeInstanceOf(Date);
    expect(arg.where).toMatchObject({ id: "p1", businessId: "biz-1" });
  });

  it("remove reports not_found for another firm's row", async () => {
    (prisma.party.updateMany as any).mockResolvedValue({ count: 0 });
    await expect(svc.remove(user, "x")).rejects.toMatchObject({ response: { error: "not_found" } });
  });

  it("ledger refuses a party outside the caller's firm", async () => {
    (prisma.party.findFirst as any).mockResolvedValue(null);
    await expect(svc.ledger(user, "p-other")).rejects.toMatchObject({ response: { error: "not_found" } });
  });

  it("ledger runs the balance forward from the opening balance", async () => {
    (prisma.party.findFirst as any).mockResolvedValue({
      id: "p1", name: "Acme", type: "customer", gstin: null, phone: null, openingBalance: 1000,
    });
    (prisma.transaction.findMany as any).mockResolvedValue([
      { id: "t1", type: "sale", number: "INV-1", date: new Date(), grandTotal: 2000, paymentMode: null, referenceNo: null },
      { id: "t2", type: "payment_in", number: "PAY-1", date: new Date(), grandTotal: 500, paymentMode: "cash", referenceNo: null },
    ]);
    const led = await svc.ledger(user, "p1");
    // 1000 opening + 2000 sale (debit) - 500 received = 2500 outstanding
    expect(led.outstanding).toBe(2500);
    expect(led.entries[0]!.debit).toBe(2000);
    expect(led.entries[1]!.credit).toBe(500);
  });
});
