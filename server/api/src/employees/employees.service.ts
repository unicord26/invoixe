import { Injectable, NotFoundException } from "@nestjs/common";
import type { z } from "zod";
import { PrismaClient } from "@invoixe/db";
import {
  createEmployeeSchema,
  createEmployeeAttendanceSchema,
  createEmployeePaymentSchema,
} from "@invoixe/types";
import type { AuthUser } from "../lib/auth";
import { getUserBusinessId } from "../lib/business";

export const employeeBodySchema = createEmployeeSchema.omit({ businessId: true });
export const employeePatchSchema = employeeBodySchema.partial();
export const attendanceBodySchema = createEmployeeAttendanceSchema;
export const paymentBodySchema = createEmployeePaymentSchema.omit({ employeeId: true });

export type EmployeeBody = z.infer<typeof employeeBodySchema>;
export type EmployeePatch = z.infer<typeof employeePatchSchema>;
export type AttendanceBody = z.infer<typeof attendanceBodySchema>;
export type PaymentBody = z.infer<typeof paymentBodySchema>;

export function inferDepartment(role?: string | null, currentDept?: string | null): string {
  if (currentDept && currentDept.trim() !== "") return currentDept;
  if (!role) return "General";

  const r = role.toLowerCase();
  if (r.includes("account") || r.includes("finance") || r.includes("tax") || r.includes("billing") || r.includes("bookkeep")) {
    return "Accounts";
  }
  if (r.includes("sales") || r.includes("business dev") || r.includes("marketing")) {
    return "Sales";
  }
  if (r.includes("inventory") || r.includes("warehouse") || r.includes("stock") || r.includes("logistics") || r.includes("store")) {
    return "Warehouse";
  }
  if (r.includes("dev") || r.includes("engineer") || r.includes("tech") || r.includes("software") || r.includes("it ") || r.includes("web")) {
    return "Tech";
  }
  if (r.includes("admin") || r.includes("hr") || r.includes("office") || r.includes("reception")) {
    return "Admin";
  }
  if (r.includes("support") || r.includes("service") || r.includes("helpdesk")) {
    return "Support";
  }
  if (r.includes("manager") || r.includes("director") || r.includes("head") || r.includes("vp") || r.includes("ceo")) {
    return "Management";
  }
  return "General";
}

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(businessId: string) {
    const list = await this.prisma.employee.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { name: "asc" },
    });

    // Backend Domain Categorization Engine: auto-categorize in DB if department is missing
    const updated = await Promise.all(
      list.map(async (emp) => {
        if (!emp.department || emp.department.trim() === "") {
          const dept = inferDepartment(emp.role, emp.department);
          await this.prisma.employee.update({
            where: { id: emp.id },
            data: { department: dept },
          });
          return { ...emp, department: dept };
        }
        return emp;
      })
    );

    return updated;
  }

  async create(user: AuthUser, body: EmployeeBody) {
    const businessId = await getUserBusinessId(user);
    const department = body.department || inferDepartment(body.role);
    return this.prisma.employee.create({
      data: {
        ...body,
        department,
        businessId,
      },
    });
  }

  async update(user: AuthUser, id: string, body: EmployeePatch) {
    const businessId = await getUserBusinessId(user);
    const emp = await this.prisma.employee.findFirst({
      where: { id, businessId, deletedAt: null },
    });
    if (!emp) throw new NotFoundException({ error: "not_found" });

    const department = body.department || (body.role ? inferDepartment(body.role, emp.department) : emp.department);

    return this.prisma.employee.update({
      where: { id },
      data: {
        ...body,
        department,
      },
    });
  }

  async remove(user: AuthUser, id: string) {
    const businessId = await getUserBusinessId(user);
    const emp = await this.prisma.employee.findFirst({
      where: { id, businessId, deletedAt: null },
    });
    if (!emp) throw new NotFoundException({ error: "not_found" });

    await this.prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /* ---------------- Attendance ---------------- */

  async listAttendance(user: AuthUser, month?: string, date?: string) {
    const businessId = await getUserBusinessId(user);
    const where: any = { businessId };
    if (date) {
      where.date = date;
    } else if (month) {
      where.date = { startsWith: month };
    }
    return this.prisma.employeeAttendance.findMany({
      where,
      orderBy: { date: "desc" },
    });
  }

  async markAttendance(user: AuthUser, body: AttendanceBody) {
    const businessId = await getUserBusinessId(user);
    return this.prisma.employeeAttendance.upsert({
      where: {
        employeeId_date: {
          employeeId: body.employeeId,
          date: body.date,
        },
      },
      update: {
        status: body.status,
      },
      create: {
        employeeId: body.employeeId,
        businessId,
        date: body.date,
        status: body.status,
      },
    });
  }

  async bulkMarkAttendance(user: AuthUser, date: string, status: string = "present") {
    const businessId = await getUserBusinessId(user);
    const activeEmployees = await this.prisma.employee.findMany({
      where: { businessId, status: "active", deletedAt: null },
      select: { id: true },
    });

    const ops = activeEmployees.map((emp) =>
      this.prisma.employeeAttendance.upsert({
        where: {
          employeeId_date: {
            employeeId: emp.id,
            date,
          },
        },
        update: { status },
        create: {
          employeeId: emp.id,
          businessId,
          date,
          status,
        },
      })
    );

    return this.prisma.$transaction(ops);
  }

  /* ---------------- Payments ---------------- */

  async listPayments(user: AuthUser, employeeId?: string) {
    const businessId = await getUserBusinessId(user);
    const where: any = { businessId };
    if (employeeId) where.employeeId = employeeId;
    return this.prisma.employeePayment.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        employee: { select: { id: true, name: true, role: true } },
      },
    });
  }

  async createPayment(user: AuthUser, employeeId: string, body: PaymentBody) {
    const businessId = await getUserBusinessId(user);
    const emp = await this.prisma.employee.findFirst({
      where: { id: employeeId, businessId, deletedAt: null },
    });
    if (!emp) throw new NotFoundException({ error: "employee_not_found" });

    return this.prisma.employeePayment.create({
      data: {
        ...body,
        employeeId,
        businessId,
      },
    });
  }
}

