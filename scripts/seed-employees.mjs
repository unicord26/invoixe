/**
 * seed-employees.mjs
 * -------------------
 * Clears all existing employees (+ attendance + payments) and seeds 10 demo employees:
 *   - 6 active   -> joined today / this week (fresh)
 *   - 2 active   -> joined 2 months ago with attendance + salary history
 *   - 2 inactive -> joined 5 months ago, relieved last month with full history
 *
 * Usage (from project root):
 *   node scripts/seed-employees.mjs
 */

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env from project root
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, "../.env");
for (const line of readFileSync(envPath, "utf-8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)="?([^"#]*)"?\s*$/);
  if (m) process.env[m[1]] = m[2].trim();
}

// Use the direct URL so we are not behind a connection pooler
process.env.DATABASE_URL = process.env.DIRECT_URL;

const prisma = new PrismaClient({ log: [] });

// ── Helpers ──────────────────────────────────────────────────────────

function dateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

function monthAgo(months = 0, day = 1) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(day);
  return d.toISOString().split("T")[0];
}

function monthStr(offsetMonths = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() - offsetMonths);
  return d.toISOString().slice(0, 7); // YYYY-MM
}

const rs = (rupees) => rupees * 100; // rupees -> paise

function workdaysForMonth(yearMonth, absentDays = []) {
  const [y, m] = yearMonth.split("-").map(Number);
  const total = new Date(y, m, 0).getDate();
  const records = [];
  for (let d = 1; d <= total; d++) {
    const obj = new Date(y, m - 1, d);
    const s = obj.toISOString().split("T")[0];
    if (obj.getDay() === 0) continue; // skip Sunday
    records.push({ date: s, status: absentDays.includes(d) ? "absent" : "present" });
  }
  return records;
}

// ── Core operations ───────────────────────────────────────────────────

async function getBusinessId() {
  const biz = await prisma.business.findFirst({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (!biz) throw new Error("No business found. Please create a business first.");
  console.log(`Business: "${biz.name}" (${biz.id})`);
  return biz.id;
}

async function clearAll(businessId) {
  console.log("\nClearing existing records...");
  const del = await prisma.$transaction([
    prisma.employeePayment.deleteMany({ where: { businessId } }),
    prisma.employeeAttendance.deleteMany({ where: { businessId } }),
    prisma.employee.deleteMany({ where: { businessId } }),
  ]);
  console.log(`  Removed ${del[0].count} payments, ${del[1].count} attendance rows, ${del[2].count} employees.`);
}

async function addEmployee(businessId, data) {
  return prisma.employee.create({
    data: { id: randomUUID(), businessId, ...data },
  });
}

async function addAttendance(businessId, employeeId, records) {
  await prisma.employeeAttendance.createMany({
    data: records.map((r) => ({
      id: randomUUID(),
      businessId,
      employeeId,
      date: r.date,
      status: r.status,
    })),
    skipDuplicates: true,
  });
}

async function addPayment(businessId, employeeId, pay) {
  return prisma.employeePayment.create({
    data: {
      id: randomUUID(),
      businessId,
      employeeId,
      amount: rs(pay.amountRs),
      type: pay.type,
      paymentMode: pay.mode,
      date: pay.date,
      monthPeriod: pay.monthPeriod ?? null,
      note: pay.note ?? null,
    },
  });
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  const businessId = await getBusinessId();
  await clearAll(businessId);

  const today = dateStr(0);
  const lm    = monthStr(1);
  const tma   = monthStr(2);

  console.log("\nSeeding employees...");

  // ─── 6 Fresh Active Employees (joined today / this week) ──────────

  const freshStaff = [
    { code: "EMP-001", name: "Ravi Kumar",   phone: "9876501001", email: "ravi.kumar@demo.in",   role: "Sales Executive",      department: "Sales",      salary: rs(28000), joiningDate: today,       bankName: "HDFC Bank",  accountNo: "50100234567890", ifscCode: "HDFC0001234" },
    { code: "EMP-002", name: "Priya Nair",   phone: "9876502002", email: "priya.nair@demo.in",   role: "Accountant",           department: "Accounts",   salary: rs(35000), joiningDate: today,       bankName: "ICICI Bank", accountNo: "12340056789",   ifscCode: "ICIC0000567" },
    { code: "EMP-003", name: "Arun Sharma",  phone: "9876503003", email: "arun.sharma@demo.in",  role: "Warehouse Supervisor", department: "Warehouse",  salary: rs(32000), joiningDate: dateStr(-5), upiId: "arun.sharma@ybl" },
    { code: "EMP-004", name: "Meera Joshi",  phone: "9876504004", email: "meera.joshi@demo.in",  role: "HR Executive",         department: "Admin",      salary: rs(30000), joiningDate: dateStr(-8), bankName: "SBI",        accountNo: "31234567890",   ifscCode: "SBIN0001122" },
    { code: "EMP-005", name: "Suresh Babu",  phone: "9876505005", email: "suresh.babu@demo.in",  role: "Delivery Executive",   department: "Support",    salary: rs(22000), joiningDate: dateStr(-3), upiId: "sureshbabu@paytm" },
    { code: "EMP-006", name: "Lakshmi Devi", phone: "9876506006", email: "lakshmi.devi@demo.in", role: "Store Manager",        department: "Management", salary: rs(55000), joiningDate: today,       bankName: "Axis Bank",  accountNo: "91234567891",   ifscCode: "UTIB0000999" },
  ];

  for (const emp of freshStaff) {
    await addEmployee(businessId, { ...emp, status: "active" });
    console.log(`  + ${emp.name} (${emp.role}) — joined ${emp.joiningDate}`);
  }

  // ─── 2 Active with 2 months of attendance + salary history ────────

  const karan = await addEmployee(businessId, {
    code: "EMP-007", name: "Karan Mehta", phone: "9876507007", email: "karan.mehta@demo.in",
    role: "Senior Sales Manager", department: "Sales", salary: rs(48000), status: "active",
    joiningDate: monthAgo(2, 1), bankName: "HDFC Bank", accountNo: "50200789012", ifscCode: "HDFC0004567",
  });
  await addAttendance(businessId, karan.id, [
    ...workdaysForMonth(tma, [12, 19, 26]),
    ...workdaysForMonth(lm, [8]),
  ]);
  await addPayment(businessId, karan.id, { amountRs: 42600, type: "salary", mode: "bank_transfer", date: monthAgo(1, 29), monthPeriod: tma, note: `Salary ${tma} (3 LOP days deducted)` });
  await addPayment(businessId, karan.id, { amountRs: 46400, type: "salary", mode: "bank_transfer", date: today, monthPeriod: lm, note: `Salary ${lm} (1 LOP day deducted)` });
  console.log(`  + Karan Mehta (Sr. Sales Mgr) — 2 months history, 2 salary payments`);

  const anjali = await addEmployee(businessId, {
    code: "EMP-008", name: "Anjali Verma", phone: "9876508008", email: "anjali.verma@demo.in",
    role: "Finance Analyst", department: "Accounts", salary: rs(42000), status: "active",
    joiningDate: monthAgo(2, 5), bankName: "Kotak Bank", accountNo: "45678901234", ifscCode: "KKBK0002233", upiId: "anjali.verma@kotak",
  });
  const anjaliLmDays = workdaysForMonth(lm, []).map((r, i) =>
    i === 5 || i === 15 ? { ...r, status: "half_day" } : r
  );
  await addAttendance(businessId, anjali.id, [...workdaysForMonth(tma, []), ...anjaliLmDays]);
  await addPayment(businessId, anjali.id, { amountRs: 42000, type: "salary", mode: "bank_transfer", date: monthAgo(1, 28), monthPeriod: tma, note: `Salary ${tma} — full month` });
  await addPayment(businessId, anjali.id, { amountRs: 41650, type: "salary", mode: "bank_transfer", date: today, monthPeriod: lm, note: `Salary ${lm} (2 half-days)` });
  await addPayment(businessId, anjali.id, { amountRs: 5000, type: "bonus", mode: "bank_transfer", date: monthAgo(1, 15), note: "Q2 performance bonus" });
  console.log(`  + Anjali Verma (Finance Analyst) — 2 months history, salary + bonus`);

  // ─── 2 Inactive with 5 months history ────────────────────────────

  const deepak = await addEmployee(businessId, {
    code: "EMP-009", name: "Deepak Singh", phone: "9876509009", email: "deepak.singh@demo.in",
    role: "IT Support Engineer", department: "Tech", salary: rs(38000), status: "inactive",
    joiningDate: monthAgo(5, 10), leavingDate: monthAgo(1, 20),
    notes: "Resigned voluntarily. Full & Final settlement completed.",
    bankName: "SBI", accountNo: "56789012345", ifscCode: "SBIN0003344",
  });
  for (let mo = 5; mo >= 2; mo--) {
    await addAttendance(businessId, deepak.id, workdaysForMonth(monthStr(mo), mo === 3 ? [5, 14] : []));
  }
  await addAttendance(businessId, deepak.id, workdaysForMonth(lm, []).slice(0, 14));
  for (let mo = 5; mo >= 2; mo--) {
    await addPayment(businessId, deepak.id, {
      amountRs: mo === 3 ? 35500 : 38000, type: "salary", mode: "bank_transfer",
      date: monthAgo(mo - 1, 28), monthPeriod: monthStr(mo),
      note: `Salary ${monthStr(mo)}${mo === 3 ? " (2 LOP days)" : ""}`,
    });
  }
  await addPayment(businessId, deepak.id, { amountRs: 17300, type: "salary", mode: "bank_transfer", date: monthAgo(0, 25), monthPeriod: lm, note: `Full & Final — ${lm} (14 days worked)` });
  console.log(`  + Deepak Singh (IT Eng.) — 5 months, relieved + Full & Final done`);

  const sunita = await addEmployee(businessId, {
    code: "EMP-010", name: "Sunita Rao", phone: "9876510010", email: "sunita.rao@demo.in",
    role: "Marketing Executive", department: "Sales", salary: rs(25000), status: "inactive",
    joiningDate: monthAgo(5, 1), leavingDate: monthAgo(1, 15),
    notes: "Fixed-term contract ended. Not renewed.",
    upiId: "sunita.rao@upi",
  });
  for (let mo = 5; mo >= 2; mo--) {
    await addAttendance(businessId, sunita.id, workdaysForMonth(monthStr(mo), [10, 20]));
  }
  for (let mo = 5; mo >= 2; mo--) {
    await addPayment(businessId, sunita.id, {
      amountRs: 23400, type: "salary", mode: "cash",
      date: monthAgo(mo - 1, 28), monthPeriod: monthStr(mo),
      note: `Salary ${monthStr(mo)} (2 LOP days)`,
    });
  }
  await addPayment(businessId, sunita.id, { amountRs: 11700, type: "salary", mode: "cash", date: monthAgo(0, 20), monthPeriod: lm, note: `Partial salary ${lm} — contract end (15 days)` });
  console.log(`  + Sunita Rao (Marketing Exec.) — 5 months, contract ended`);

  console.log(`
Done!
  Active   (fresh, today/this week): 6
  Active   (2 months history):       2
  Inactive (5 months, relieved):     2
  Total seeded:                     10
`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Seed failed:", err.message);
  await prisma.$disconnect();
  process.exit(1);
});
