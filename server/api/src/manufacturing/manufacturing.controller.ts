import {
  BadRequestException, Body, Controller, Get, HttpCode, Injectable, Module, Param, Post, Put, UseGuards,
} from "@nestjs/common";
import { PrismaClient } from "@invoixe/db";
import type { AuthUser } from "../lib/auth";
import { getUserBusinessId } from "../lib/business";
import { CurrentUser, SupabaseAuthGuard } from "../common/supabase-auth.guard";

interface BomBody {
  lines?: unknown;
}
interface ProductionBody {
  itemId?: string;
  qty?: unknown;
}

@Injectable()
export class ManufacturingService {
  constructor(private readonly prisma: PrismaClient) {}

  /** BOM (raw materials) for a finished good. */
  async bom(user: AuthUser, itemId: string) {
    const businessId = await getUserBusinessId(user);
    const bom = await this.prisma.bom.findFirst({ where: { businessId, itemId }, include: { lines: true } });
    return bom ?? { itemId, lines: [] };
  }

  /** Replace the BOM lines: [{ rawItemId, qty }]. */
  async setBom(user: AuthUser, itemId: string, body: BomBody) {
    const businessId = await getUserBusinessId(user);
    const lines: { rawItemId: string; qty: number }[] = Array.isArray(body?.lines) ? body.lines : [];
    const clean = lines.filter((l) => l.rawItemId && Number(l.qty) > 0);

    const bom = await this.prisma.bom.upsert({
      where: { businessId_itemId: { businessId, itemId } },
      create: { businessId, itemId },
      update: {},
    });
    await this.prisma.bomLine.deleteMany({ where: { bomId: bom.id } });
    if (clean.length) {
      await this.prisma.bomLine.createMany({
        data: clean.map((l) => ({ bomId: bom.id, rawItemId: l.rawItemId, qty: Number(l.qty) })),
      });
    }
    return this.prisma.bom.findUnique({ where: { id: bom.id }, include: { lines: true } });
  }

  /** Build `qty` of a finished good, consuming raw materials. */
  async produce(user: AuthUser, body: ProductionBody) {
    const businessId = await getUserBusinessId(user);
    const itemId = body?.itemId;
    const qty = Number(body?.qty);
    if (!itemId || !Number.isFinite(qty) || qty <= 0) throw new BadRequestException({ error: "invalid_input" });

    const bom = await this.prisma.bom.findFirst({ where: { businessId, itemId }, include: { lines: true } });
    if (!bom || bom.lines.length === 0) throw new BadRequestException({ error: "no_bom" });

    const moves = [
      ...bom.lines.map((l) => ({
        businessId, itemId: l.rawItemId, qty: -(l.qty * qty), reason: "production_consume",
      })),
      { businessId, itemId, qty, reason: "production_output" },
    ];
    await this.prisma.stockMovement.createMany({ data: moves });
    return { ok: true, produced: qty, consumed: bom.lines.length };
  }
}

// These two controllers are mounted at /api/bom and /api/production.

@Controller("bom")
@UseGuards(SupabaseAuthGuard)
export class BomController {
  constructor(private readonly mfg: ManufacturingService) {}

  @Get(":itemId")
  bom(@CurrentUser() user: AuthUser, @Param("itemId") itemId: string) {
    return this.mfg.bom(user, itemId);
  }

  @Put(":itemId")
  setBom(@CurrentUser() user: AuthUser, @Param("itemId") itemId: string, @Body() body: BomBody) {
    return this.mfg.setBom(user, itemId, body);
  }
}

@Controller("production")
@UseGuards(SupabaseAuthGuard)
export class ProductionController {
  constructor(private readonly mfg: ManufacturingService) {}

  @Post()
  @HttpCode(201)
  produce(@CurrentUser() user: AuthUser, @Body() body: ProductionBody) {
    return this.mfg.produce(user, body);
  }
}

@Module({
  controllers: [BomController, ProductionController],
  providers: [ManufacturingService],
})
export class ManufacturingModule {}
