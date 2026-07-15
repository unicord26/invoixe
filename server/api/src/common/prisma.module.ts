import { Global, Module } from "@nestjs/common";
import { PrismaClient, prisma } from "@invoixe/db";

/**
 * Exposes the @invoixe/db singleton to Nest's DI container.
 *
 * We provide the existing instance rather than constructing a new PrismaClient:
 * @invoixe/db caches it on globalThis so dev reloads don't exhaust the Postgres
 * connection pool. Providing it under the PrismaClient token keeps injection
 * by type (`constructor(private readonly prisma: PrismaClient)`).
 */
@Global()
@Module({
  providers: [{ provide: PrismaClient, useValue: prisma }],
  exports: [PrismaClient],
})
export class PrismaModule {}
