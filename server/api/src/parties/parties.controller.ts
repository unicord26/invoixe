import { Body, Controller, Delete, Get, HttpCode, Module, Param, Patch, Post, UseGuards } from "@nestjs/common";
import type { AuthUser } from "../lib/auth";
import { CurrentUser, SupabaseAuthGuard } from "../common/supabase-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { getUserBusinessId } from "../lib/business";
import {
  PartiesService,
  partyBodySchema,
  partyPatchSchema,
  type PartyBody,
  type PartyPatch,
} from "./parties.service";

@Controller("parties")
@UseGuards(SupabaseAuthGuard)
export class PartiesController {
  constructor(private readonly parties: PartiesService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    return this.parties.list(await getUserBusinessId(user));
  }

  @Get(":id/ledger")
  ledger(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.parties.ledger(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body(new ZodValidationPipe(partyBodySchema)) body: PartyBody) {
    return this.parties.create(user, body);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(partyPatchSchema)) body: PartyPatch
  ) {
    return this.parties.update(user, id, body);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.parties.remove(user, id);
  }
}

@Module({ controllers: [PartiesController], providers: [PartiesService] })
export class PartiesModule {}
