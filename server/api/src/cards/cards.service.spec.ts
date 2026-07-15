import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@invoixe/db";
import type { AuthUser } from "../lib/auth";

const getUserBusinessId = vi.fn(async (_user: AuthUser) => "biz-1");
vi.mock("../lib/business", () => ({ getUserBusinessId: (u: AuthUser) => getUserBusinessId(u) }));

const { CardsService } = await import("./cards.controller");

const user: AuthUser = { id: "u1", email: "a@b.com" };

function mockPrisma() {
  return {
    paymentCard: {
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => ({ id: "c1" })),
      create: vi.fn(async ({ data }: any) => ({ id: "c1", ...data })),
      update: vi.fn(async () => ({ id: "c1" })),
    },
  } as unknown as PrismaClient & Record<string, any>;
}

describe("CardsService — PCI-DSS: never persist more than the last four", () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let svc: InstanceType<typeof CardsService>;
  const dataOf = () => (prisma.paymentCard.create as any).mock.calls[0][0].data;

  beforeEach(() => {
    prisma = mockPrisma();
    svc = new CardsService(prisma);
  });

  it("stores only the last 4 digits when a FULL card number is submitted", async () => {
    await svc.create(user, { label: "HDFC", last4: "4111111111111111" });
    const d = dataOf();
    expect(d.last4).toBe("1111");
    // The PAN must not survive anywhere in the persisted row.
    expect(JSON.stringify(d)).not.toContain("4111111111111111");
  });

  it("ignores a CVV or any other field the client tries to sneak in", async () => {
    await svc.create(user, { label: "HDFC", last4: "1234", cvv: "999", pan: "4111111111111111" } as never);
    const d = dataOf();
    expect(JSON.stringify(d)).not.toContain("999");
    expect(JSON.stringify(d)).not.toContain("4111111111111111");
    expect(Object.keys(d).sort()).toEqual(
      ["businessId", "expiryLabel", "holderName", "kind", "label", "last4", "network"].sort()
    );
  });

  it("strips separators before taking the last four", async () => {
    await svc.create(user, { label: "X", last4: "4111-1111 1111-9876" });
    expect(dataOf().last4).toBe("9876");
  });

  it("requires a label", async () => {
    await expect(svc.create(user, { label: "  ", last4: "1234" })).rejects.toMatchObject({
      response: { error: "label_required" },
    });
  });

  it("requires at least four digits", async () => {
    await expect(svc.create(user, { label: "X", last4: "12" })).rejects.toMatchObject({
      response: { error: "last4_required" },
    });
  });

  it("falls back to safe defaults for unknown network/kind", async () => {
    await svc.create(user, { label: "X", last4: "1234", network: "'; DROP TABLE--", kind: "weird" });
    expect(dataOf().network).toBe("other");
    expect(dataOf().kind).toBe("debit");
  });

  it("keeps a known network/kind", async () => {
    await svc.create(user, { label: "X", last4: "1234", network: "rupay", kind: "credit" });
    expect(dataOf().network).toBe("rupay");
    expect(dataOf().kind).toBe("credit");
  });

  it("scopes the card to the session's business", async () => {
    await svc.create(user, { label: "X", last4: "1234" });
    expect(dataOf().businessId).toBe("biz-1");
  });

  it("refuses to delete a card belonging to another firm", async () => {
    (prisma.paymentCard.findFirst as any).mockResolvedValue(null);
    await expect(svc.remove(user, "someone-elses-card")).rejects.toMatchObject({
      response: { error: "not_found" },
    });
  });
});
