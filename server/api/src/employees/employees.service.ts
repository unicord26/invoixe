import { Injectable, NotFoundException } from "@nestjs/common";
import type { z } from "zod";
import { PrismaClient } from "@invoixe/db";
import { createEmployeeSchema } from "@invoixe/types";
import type { AuthUser } from "../lib/auth";
import { getUserBusinessId } from "../lib/business";

export const employeeBodySchema = createEmployeeSchema.omit({ businessId: true });
export const employeePatchSchema = employeeBodySchema.partial();

export type EmployeeBody = z.infer<typeof employeeBodySchema>;
export type EmployeePatch = z.infer<typeof employeePatchSchema>;

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaClient) {}

  list(businessId: string) {
    return this.prisma.employee.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  async create(user: AuthUser, body: EmployeeBody) {
    const businessId = await getUserBusinessId(user);
    return this.prisma.employee.create({
      data: {
        ...body,
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

    return this.prisma.employee.update({
      where: { id },
      data: body,
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
}
