import { Body, Controller, Delete, Get, HttpCode, Module, Param, Patch, Post, UseGuards } from "@nestjs/common";
import type { AuthUser } from "../lib/auth";
import { CurrentUser, SupabaseAuthGuard } from "../common/supabase-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { getUserBusinessId } from "../lib/business";
import {
  EmployeesService,
  employeeBodySchema,
  employeePatchSchema,
  type EmployeeBody,
  type EmployeePatch,
} from "./employees.service";

@Controller("employees")
@UseGuards(SupabaseAuthGuard)
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    return this.employees.list(await getUserBusinessId(user));
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body(new ZodValidationPipe(employeeBodySchema)) body: EmployeeBody) {
    return this.employees.create(user, body);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(employeePatchSchema)) body: EmployeePatch
  ) {
    return this.employees.update(user, id, body);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.employees.remove(user, id);
  }
}

@Module({ controllers: [EmployeesController], providers: [EmployeesService] })
export class EmployeesModule {}
