import { Injectable, NotFoundException } from "@nestjs/common";
import type { z } from "zod";
import { PrismaClient } from "@invoixe/db";
import { createPartySchema } from "@invoixe/types";
import type { AuthUser } from "../lib/auth";
import { getUserBusinessId } from "../lib/business";
import { signedBalanceDelta } from "../lib/ledger";

// businessId is derived from the authenticated user, never trusted from the client.
export const partyBodySchema = createPartySchema.omit({ businessId: true });
export const partyPatchSchema = partyBodySchema.partial();

export type PartyBody = z.infer<typeof partyBodySchema>;
export type PartyPatch = z.infer<typeof partyPatchSchema>;

@Injectable()
export class PartiesService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(businessId: string) {
    const parties = await this.prisma.party.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { name: "asc" },
    });
    const txns = await this.prisma.transaction.findMany({
      where: { businessId, deletedAt: null, partyId: { not: null } },
      select: { partyId: true, type: true, grandTotal: true },
    });
    const balanceMap: Record<string, number> = {};
    for (const t of txns) {
      if (!t.partyId) continue;
      balanceMap[t.partyId] = (balanceMap[t.partyId] ?? 0) + signedBalanceDelta(t.type, t.grandTotal);
    }
    return parties.map((p) => ({
      ...p,
      balance: p.openingBalance + (balanceMap[p.id] ?? 0),
    }));
  }

  /** Running balance + outstanding for one party. */
  async ledger(user: AuthUser, id: string) {
    const businessId = await getUserBusinessId(user);
    const party = await this.prisma.party.findFirst({ where: { id, businessId, deletedAt: null } });
    if (!party) throw new NotFoundException({ error: "not_found" });

    const txns = await this.prisma.transaction.findMany({
      where: { businessId, partyId: party.id, deletedAt: null },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      select: {
        id: true, type: true, number: true, date: true,
        grandTotal: true, paymentMode: true, referenceNo: true,
      },
    });

    let balance = party.openingBalance;
    const entries = txns.map((t) => {
      const delta = signedBalanceDelta(t.type, t.grandTotal);
      balance += delta;
      return { ...t, debit: delta > 0 ? delta : 0, credit: delta < 0 ? -delta : 0, balance };
    });

    return {
      party: { id: party.id, name: party.name, type: party.type, gstin: party.gstin, phone: party.phone },
      openingBalance: party.openingBalance,
      entries,
      outstanding: balance,
    };
  }

  async create(user: AuthUser, data: PartyBody) {
    const businessId = await getUserBusinessId(user);
    return this.prisma.party.create({ data: { ...data, businessId } });
  }

  async update(user: AuthUser, id: string, data: PartyPatch) {
    const businessId = await getUserBusinessId(user);
    const { count } = await this.prisma.party.updateMany({
      where: { id, businessId, deletedAt: null },
      data,
    });
    if (count === 0) throw new NotFoundException({ error: "not_found" });
    return this.prisma.party.findUnique({ where: { id } });
  }

  async remove(user: AuthUser, id: string) {
    const businessId = await getUserBusinessId(user);
    const { count } = await this.prisma.party.updateMany({
      where: { id, businessId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (count === 0) throw new NotFoundException({ error: "not_found" });
  }
}
