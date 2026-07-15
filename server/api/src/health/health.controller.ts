import { Controller, Get, Injectable, Module, Res } from "@nestjs/common";
import type { Response } from "express";
import { PrismaClient } from "@invoixe/db";

export interface SupabaseHealth {
  db: "connected" | "error";
  latencyMs: number;
  error?: string;
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Ping Supabase Postgres (via Prisma) — the meaningful backend-connectivity signal. */
  async supabase(): Promise<SupabaseHealth> {
    const started = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { db: "connected", latencyMs: Date.now() - started };
    } catch (e) {
      return { db: "error", latencyMs: Date.now() - started, error: e instanceof Error ? e.message : String(e) };
    }
  }
}

// Public — reports Supabase connectivity so the client can verify the full chain.
@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  async check(@Res() res: Response) {
    const supabase = await this.health.supabase();
    res.status(supabase.db === "connected" ? 200 : 503).json({
      ok: supabase.db === "connected",
      service: "invoixe-api",
      supabase,
      time: new Date().toISOString(),
    });
  }
}

@Module({ controllers: [HealthController], providers: [HealthService], exports: [HealthService] })
export class HealthModule {}
