import { Body, Controller, Delete, Get, HttpCode, Module, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { AuthUser } from "../lib/auth";
import { CurrentUser, SupabaseAuthGuard } from "../common/supabase-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { getUserBusinessId } from "../lib/business";
import {
  EmployeesService,
  employeeBodySchema,
  employeePatchSchema,
  attendanceBodySchema,
  paymentBodySchema,
  type EmployeeBody,
  type EmployeePatch,
  type AttendanceBody,
  type PaymentBody,
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

  /* ---------------- Attendance Routes ---------------- */

  @Get("attendance")
  listAttendance(
    @CurrentUser() user: AuthUser,
    @Query("month") month?: string,
    @Query("date") date?: string
  ) {
    return this.employees.listAttendance(user, month, date);
  }

  @Post("attendance")
  markAttendance(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(attendanceBodySchema)) body: AttendanceBody
  ) {
    return this.employees.markAttendance(user, body);
  }

  @Post("attendance/bulk")
  bulkMarkAttendance(
    @CurrentUser() user: AuthUser,
    @Body() body: { date: string; status?: string }
  ) {
    return this.employees.bulkMarkAttendance(user, body.date, body.status || "present");
  }

  /* ---------------- Payment / Salary Routes ---------------- */

  @Get("payments")
  listPayments(@CurrentUser() user: AuthUser, @Query("employeeId") employeeId?: string) {
    return this.employees.listPayments(user, employeeId);
  }

  @Post(":id/payments")
  createPayment(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(paymentBodySchema)) body: PaymentBody
  ) {
    return this.employees.createPayment(user, id, body);
  }
}

@Module({ controllers: [EmployeesController], providers: [EmployeesService] })
export class EmployeesModule {}

