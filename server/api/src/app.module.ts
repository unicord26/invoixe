import { Module } from "@nestjs/common";
import { PrismaModule } from "./common/prisma.module";
import { HealthModule } from "./health/health.controller";
import { PartiesModule } from "./parties/parties.controller";

@Module({
  imports: [PrismaModule, HealthModule, PartiesModule],
})
export class AppModule {}
