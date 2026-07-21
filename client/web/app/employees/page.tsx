"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  MoreHorizontal,
  Phone,
  Trash2,
  Search,
  ArrowLeft,
  Users,
  UserMinus,
  UserCheck,
  DollarSign,
  Pencil,
  Calendar,
  CreditCard,
  Printer,
  User,
  ShieldAlert,
  Wallet,
  Receipt,
  Check,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import { formatINR, rupeesToPaise, paiseToRupees, inWordsINR } from "@invoixe/core";
import type { Employee, EmployeeAttendance, EmployeePayment } from "@invoixe/types";
import { api } from "../../lib/api";

type Business = {
  id: string;
  name: string;
  gstin: string | null;
  pan: string | null;
  stateCode: string | null;
  stateName: string | null;
  address: string | null;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  signatureUrl: string | null;
};
import { PageHeader } from "../../components/page-header";
import { DataTable, type Column } from "../../components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DEPARTMENTS = ["Sales", "Accounts", "Warehouse", "Admin", "Support", "Tech", "Management", "Other"];

/* ---------------- Form Schemas ---------------- */

const formSchema = z.object({
  code: z.string().trim().optional().nullable(),
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().optional().nullable(),
  email: z.string().email().or(z.literal("")).optional().nullable(),
  role: z.string().trim().optional().nullable(),
  department: z.string().optional().nullable(),
  salary: z.coerce.number().nonnegative("Salary must be positive").optional().nullable(),
  status: z.enum(["active", "inactive"]),
  joiningDate: z.string().optional().nullable(),
  leavingDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  panNo: z.string().trim().optional().nullable(),
  aadhaarNo: z.string().trim().optional().nullable(),
  bankName: z.string().trim().optional().nullable(),
  accountNo: z.string().trim().optional().nullable(),
  ifscCode: z.string().trim().optional().nullable(),
  upiId: z.string().trim().optional().nullable(),
  emergencyContactName: z.string().trim().optional().nullable(),
  emergencyContactPhone: z.string().trim().optional().nullable(),
});
type FormValues = z.infer<typeof formSchema>;

const DEFAULTS: FormValues = {
  code: "",
  name: "",
  phone: "",
  email: "",
  role: "",
  department: "",
  salary: null,
  status: "active",
  joiningDate: "",
  leavingDate: "",
  notes: "",
  address: "",
  panNo: "",
  aadhaarNo: "",
  bankName: "",
  accountNo: "",
  ifscCode: "",
  upiId: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

const paymentFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  type: z.enum(["salary", "advance", "bonus", "deduction"]),
  paymentMode: z.enum(["cash", "bank_transfer", "upi", "cheque"]),
  date: z.string().min(1, "Date is required"),
  monthPeriod: z.string().optional().nullable(),
  referenceNo: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});
type PaymentFormValues = z.infer<typeof paymentFormSchema>;

/* ---------------- Employee Add/Edit Dialog ---------------- */

interface EmployeeDialogProps {
  employee?: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
}

function EmployeeDialog({ employee, open, onOpenChange, trigger }: EmployeeDialogProps) {
  const qc = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULTS,
  });

  const isEdit = !!employee;
  const statusValue = form.watch("status");

  useEffect(() => {
    if (open) {
      if (employee) {
        form.reset({
          code: employee.code || "",
          name: employee.name,
          phone: employee.phone || "",
          email: employee.email || "",
          role: employee.role || "",
          department: employee.department || "",
          salary: employee.salary ? paiseToRupees(employee.salary) : null,
          status: employee.status as "active" | "inactive",
          joiningDate: employee.joiningDate || "",
          leavingDate: employee.leavingDate || "",
          notes: employee.notes || "",
          address: employee.address || "",
          panNo: employee.panNo || "",
          aadhaarNo: employee.aadhaarNo || "",
          bankName: employee.bankName || "",
          accountNo: employee.accountNo || "",
          ifscCode: employee.ifscCode || "",
          upiId: employee.upiId || "",
          emergencyContactName: employee.emergencyContactName || "",
          emergencyContactPhone: employee.emergencyContactPhone || "",
        });
      } else {
        form.reset(DEFAULTS);
      }
    }
  }, [employee, open, form]);

  const handleClose = (o: boolean) => {
    onOpenChange(o);
    if (!o) {
      form.reset(DEFAULTS);
    }
  };

  const mutation = useMutation({
    mutationFn: (v: FormValues) => {
      const payload = {
        code: v.code?.trim() || null,
        name: v.name.trim(),
        phone: v.phone || null,
        email: v.email || null,
        role: v.role || null,
        department: v.department || null,
        salary: v.salary ? rupeesToPaise(v.salary) : null,
        status: v.status,
        joiningDate: v.joiningDate || null,
        leavingDate: v.status === "inactive" ? (v.leavingDate || null) : null,
        notes: v.notes || null,
        address: v.address || null,
        panNo: v.panNo?.trim().toUpperCase() || null,
        aadhaarNo: v.aadhaarNo?.trim() || null,
        bankName: v.bankName?.trim() || null,
        accountNo: v.accountNo?.trim() || null,
        ifscCode: v.ifscCode?.trim().toUpperCase() || null,
        upiId: v.upiId?.trim() || null,
        emergencyContactName: v.emergencyContactName?.trim() || null,
        emergencyContactPhone: v.emergencyContactPhone?.trim() || null,
      };

      if (isEdit && employee) {
        return api.patch<Employee>(`/api/employees/${employee.id}`, payload);
      } else {
        return api.post<Employee>("/api/employees", payload);
      }
    },
    onSuccess: (emp) => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success(isEdit ? `Updated ${emp.name}` : `Added ${emp.name}`);
      handleClose(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Request failed"),
  });

  const submitForm = (v: FormValues, andNew: boolean) => {
    mutation.mutate(v, {
      onSuccess: () => {
        if (andNew && !isEdit) {
          form.reset(DEFAULTS);
        } else {
          handleClose(false);
        }
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="w-[calc(100vw-2rem)] max-w-[750px] p-0 gap-0 overflow-hidden rounded-xl max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-zinc-100 shrink-0">
          <DialogTitle className="text-xl font-semibold text-zinc-900 flex items-center gap-2">
            <User className="h-5 w-5 text-green-600" />
            {isEdit ? "Edit Employee Details" : "Add New Employee"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => submitForm(v, false))} className="flex flex-col overflow-hidden">
            <Tabs defaultValue="basic" className="flex flex-col flex-1 overflow-hidden">
              <div className="px-6 border-b border-zinc-100 bg-zinc-50/50">
                <TabsList className="h-10 bg-transparent gap-2 p-0">
                  <TabsTrigger value="basic" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-xs">
                    Basic Information
                  </TabsTrigger>
                  <TabsTrigger value="hr" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-xs">
                    HR &amp; Identity
                  </TabsTrigger>
                  <TabsTrigger value="bank" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-xs">
                    Bank &amp; Payroll
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="px-6 py-5 overflow-y-auto max-h-[55vh] bg-white">
                {/* Basic Info Tab */}
                <TabsContent value="basic" className="m-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-zinc-500 uppercase">Employee Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter full name" {...field} className="h-10 text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-zinc-500 uppercase">Staff Code / ID</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. EMP-001" value={field.value ?? ""} onChange={field.onChange} className="h-10 text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-zinc-500 uppercase">Designation / Role</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Senior Accountant" value={field.value ?? ""} onChange={field.onChange} className="h-10 text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-zinc-500 uppercase">Department</FormLabel>
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-10 text-sm">
                              <SelectValue placeholder="Select Department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DEPARTMENTS.map((dept) => (
                              <SelectItem key={dept} value={dept} className="text-sm">{dept}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-zinc-500 uppercase">Mobile Number</FormLabel>
                        <FormControl>
                          <Input
                            inputMode="numeric"
                            placeholder="Mobile number"
                            value={field.value ?? ""}
                            maxLength={10}
                            onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
                            className="h-10 text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-zinc-500 uppercase">Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@business.com" value={field.value ?? ""} onChange={field.onChange} className="h-10 text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem className="space-y-1 sm:col-span-2">
                        <FormLabel className="text-xs font-semibold text-zinc-500 uppercase">Employment Status</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-10 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active" className="text-sm">Active</SelectItem>
                            <SelectItem value="inactive" className="text-sm">Inactive (Past Employee)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* HR & Identity Tab */}
                <TabsContent value="hr" className="m-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="joiningDate"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-zinc-500 uppercase">Joining Date</FormLabel>
                        <FormControl>
                          <Input type="date" value={field.value ?? ""} onChange={field.onChange} className="h-10 text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {statusValue === "inactive" && (
                    <FormField
                      control={form.control}
                      name="leavingDate"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs font-semibold text-zinc-500 uppercase">Relieving / Leaving Date</FormLabel>
                          <FormControl>
                            <Input type="date" value={field.value ?? ""} onChange={field.onChange} className="h-10 text-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="panNo"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-zinc-500 uppercase">PAN Card Number</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. ABCDE1234F" maxLength={10} value={field.value ?? ""} onChange={field.onChange} className="h-10 text-sm uppercase" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="aadhaarNo"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-zinc-500 uppercase">Aadhaar Card Number</FormLabel>
                        <FormControl>
                          <Input placeholder="12-digit Aadhaar" maxLength={12} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 12))} className="h-10 text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergencyContactName"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-zinc-500 uppercase">Emergency Contact Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Contact person name" value={field.value ?? ""} onChange={field.onChange} className="h-10 text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergencyContactPhone"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-zinc-500 uppercase">Emergency Contact Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Emergency mobile number" value={field.value ?? ""} onChange={field.onChange} className="h-10 text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="col-span-2 space-y-1">
                        <FormLabel className="text-xs font-semibold text-zinc-500 uppercase">Residential Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Full residential address" value={field.value ?? ""} onChange={field.onChange} className="h-10 text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="col-span-2 space-y-1">
                        <FormLabel className="text-xs font-semibold text-zinc-500 uppercase">Internal HR Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Internal comments or background details"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            className="resize-none text-sm placeholder:text-zinc-400 h-16"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Bank & Payroll Tab */}
                <TabsContent value="bank" className="m-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem className="space-y-1 sm:col-span-2">
                        <FormLabel className="text-xs font-semibold text-zinc-500 uppercase">Monthly Base Salary (INR)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Monthly salary in ₹"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                            className="h-10 text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-zinc-500 uppercase">Bank Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. HDFC Bank, ICICI Bank" value={field.value ?? ""} onChange={field.onChange} className="h-10 text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accountNo"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-zinc-500 uppercase">Account Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Bank account number" value={field.value ?? ""} onChange={field.onChange} className="h-10 text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ifscCode"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-zinc-500 uppercase">IFSC Code</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. HDFC0001234" maxLength={11} value={field.value ?? ""} onChange={field.onChange} className="h-10 text-sm uppercase" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="upiId"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-zinc-500 uppercase">UPI VPA (ID)</FormLabel>
                        <FormControl>
                          <Input placeholder="name@upi" value={field.value ?? ""} onChange={field.onChange} className="h-10 text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </div>
            </Tabs>

            <DialogFooter className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/60 flex-row items-center justify-end gap-3 shrink-0">
              {!isEdit && (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full px-6 border-green-600 text-green-600 hover:bg-green-50 font-medium"
                  disabled={mutation.isPending}
                  onClick={() => form.handleSubmit((v) => submitForm(v, true))()}
                >
                  Save &amp; New
                </Button>
              )}
              <Button
                type="submit"
                className="rounded-full px-8 bg-green-600 hover:bg-green-700 text-white font-medium"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Record Payment / Salary Payout Modal ---------------- */

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  payments?: (EmployeePayment & { employee?: { name: string } })[];
  defaultEmployeeId?: string;
}

function RecordPaymentDialog({ open, onOpenChange, employees, payments = [], defaultEmployeeId }: RecordPaymentDialogProps) {
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0] ?? "";
  const currentMonth = today ? today.slice(0, 7) : "";

  // 1. Active staff algorithm: filter active staff only
  const activeEmployees = employees.filter((e) => e.status === "active");

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      employeeId: defaultEmployeeId || "",
      amount: 0,
      type: "salary",
      paymentMode: "bank_transfer",
      date: today,
      monthPeriod: currentMonth,
      referenceNo: "",
      note: "",
    },
  });

  const selectedEmployeeId = form.watch("employeeId");
  const selectedMonthPeriod = form.watch("monthPeriod") || currentMonth;
  const formAmount = form.watch("amount");

  const selectedEmployee = activeEmployees.find((e) => e.id === selectedEmployeeId);

  // 2. Paid locking algorithm: find employee IDs with salary payout for selected month
  const paidEmpIdsForMonth = new Set(
    payments
      .filter((p) => p.type === "salary" && p.monthPeriod === selectedMonthPeriod)
      .map((p) => p.employeeId)
  );

  const isSelectedPaidForMonth = selectedEmployeeId ? paidEmpIdsForMonth.has(selectedEmployeeId) : false;

  // 3. Attendance Sync Engine: Query monthly attendance logs for selected employee and month
  const { data: dialogMonthlyAttendances } = useQuery({
    queryKey: ["employee-attendance-dialog", selectedEmployeeId, selectedMonthPeriod],
    queryFn: () => api.get<EmployeeAttendance[]>(`/api/employees/attendance?month=${selectedMonthPeriod}`),
    enabled: open && !!selectedEmployeeId && !!selectedMonthPeriod,
  });

  const empMonthLogs = (dialogMonthlyAttendances || []).filter((a) => a.employeeId === selectedEmployeeId);
  const presentCount = empMonthLogs.filter((a) => a.status === "present").length;
  const halfDayCount = empMonthLogs.filter((a) => a.status === "half_day").length;
  const paidLeaveCount = empMonthLogs.filter((a) => a.status === "paid_leave").length;
  const absentCount = empMonthLogs.filter((a) => a.status === "absent").length;

  const [y, m] = (selectedMonthPeriod || currentMonth).split("-");
  const daysInMonth = (y && m) ? new Date(Number(y), Number(m), 0).getDate() : 30;

  let sundayCount = 0;
  if (y && m) {
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(Number(y), Number(m) - 1, d).getDay() === 0) sundayCount++;
    }
  }

  const payableDays = presentCount + halfDayCount * 0.5 + paidLeaveCount + sundayCount;
  const unpaidLopDays = Math.max(0, absentCount);
  const baseSalaryRupees = selectedEmployee ? paiseToRupees(selectedEmployee.salary || 0) : 0;
  const perDayRateRupees = baseSalaryRupees / Math.max(1, daysInMonth);
  const lopDeductionRupees = unpaidLopDays * perDayRateRupees;
  const syncedNetSalaryRupees = Math.max(0, baseSalaryRupees - lopDeductionRupees);

  const applySyncedNetSalary = () => {
    form.setValue("amount", Math.round(syncedNetSalaryRupees));
    if (selectedEmployee) {
      form.setValue(
        "note",
        `Salary for ${selectedMonthPeriod} (${payableDays.toFixed(1)} Payable Days, ${unpaidLopDays} LOP Days deducted)`
      );
    }
  };

  const applyBaseSalary = () => {
    if (selectedEmployee?.salary) {
      form.setValue("amount", paiseToRupees(selectedEmployee.salary));
      form.setValue("note", `Base Salary payout for ${selectedMonthPeriod} - ${selectedEmployee.name}`);
    }
  };

  // 4. Smart Auto-Fill Engine on employee selection
  const handleSelectEmployee = (empId: string) => {
    form.setValue("employeeId", empId);
    const emp = activeEmployees.find((e) => e.id === empId);
    if (!emp) return;

    // Auto-fill payment mode based on employee bank profile
    if (emp.accountNo || emp.bankName) {
      form.setValue("paymentMode", "bank_transfer");
    } else if (emp.upiId) {
      form.setValue("paymentMode", "upi");
    } else {
      form.setValue("paymentMode", "cash");
    }

    if (unpaidLopDays > 0) {
      applySyncedNetSalary();
    } else {
      applyBaseSalary();
    }
  };

  useEffect(() => {
    if (open) {
      if (defaultEmployeeId) {
        handleSelectEmployee(defaultEmployeeId);
      } else if (!selectedEmployeeId && activeEmployees.length > 0 && activeEmployees[0]?.id) {
        handleSelectEmployee(activeEmployees[0].id);
      }
    }
  }, [open, defaultEmployeeId]);

  const mutation = useMutation({
    mutationFn: (v: PaymentFormValues) => {
      const payload = {
        amount: rupeesToPaise(v.amount),
        type: v.type,
        paymentMode: v.paymentMode,
        date: v.date,
        monthPeriod: v.monthPeriod || null,
        referenceNo: v.referenceNo || null,
        note: v.note || null,
      };
      return api.post<EmployeePayment>(`/api/employees/${v.employeeId}/payments`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-payments"] });
      toast.success("Payment transaction recorded");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to record payment"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[650px] p-0 gap-0 overflow-hidden rounded-xl border border-zinc-200 shadow-xl">
        <DialogHeader className="px-6 py-4 border-b border-zinc-100 bg-gradient-to-r from-emerald-950 via-zinc-900 to-zinc-900 text-white flex-row items-center justify-between pr-12">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">Record Salary Payout</DialogTitle>
              <p className="text-xs text-zinc-400 mt-0.5">Disburse monthly salary, advances, or bonuses to active employees</p>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="px-6 py-5 space-y-4 max-h-[80vh] overflow-y-auto bg-white">
            {/* Employee Selector & Active Filter */}
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Select Active Employee *</FormLabel>
                  <Select value={field.value} onValueChange={handleSelectEmployee}>
                    <FormControl>
                      <SelectTrigger className="h-11 text-sm border-zinc-200 bg-white font-medium focus:ring-emerald-500">
                        <SelectValue placeholder="Select Active Staff Member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-60">
                      {activeEmployees.map((e) => {
                        const isPaidForMonth = paidEmpIdsForMonth.has(e.id);
                        return (
                          <SelectItem key={e.id} value={e.id} className="text-sm py-2">
                            <div className="flex items-center justify-between w-full gap-4">
                              <span className="font-semibold text-zinc-900">
                                {e.name} {e.code ? `(${e.code})` : ""} {e.role ? `• ${e.role}` : ""}
                              </span>
                              {isPaidForMonth && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                  <Check className="h-3 w-3" /> Paid ({selectedMonthPeriod})
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Single Unified Payroll & Attendance Summary Card */}
            {selectedEmployee && (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/60 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-700 text-white font-black text-sm flex items-center justify-center shadow-2xs shrink-0">
                      {selectedEmployee.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-zinc-900 flex items-center gap-2">
                        {selectedEmployee.name}
                        {selectedEmployee.department && (
                          <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200 font-semibold">
                            {selectedEmployee.department}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-600 mt-0.5 font-medium">
                        {selectedEmployee.accountNo
                          ? `Bank A/C: ${selectedEmployee.bankName || "Bank"} (..${selectedEmployee.accountNo.slice(-4)})`
                          : selectedEmployee.upiId
                          ? `UPI ID: ${selectedEmployee.upiId}`
                          : "Cash Payment Mode"}
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Base Monthly Salary</div>
                    <div className="text-base font-extrabold text-zinc-900">₹{Math.round(baseSalaryRupees).toLocaleString("en-IN")}</div>
                  </div>
                </div>

                {/* Attendance LOP Breakdown & High-Contrast Action Buttons */}
                {dialogMonthlyAttendances && (
                  <div className="space-y-2.5 pt-0.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-zinc-700">Attendance ({selectedMonthPeriod}):</span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">{presentCount} Present</span>
                        {halfDayCount > 0 && <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">{halfDayCount} Half</span>}
                        {paidLeaveCount > 0 && <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">{paidLeaveCount} PL</span>}
                        {unpaidLopDays > 0 ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                            {unpaidLopDays} Days LOP (-₹{Math.round(lopDeductionRupees).toLocaleString("en-IN")})
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">Full Month Present</span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase text-zinc-500 block">Net Synced Salary</span>
                        <span className="text-sm font-black text-emerald-700">₹{Math.round(syncedNetSalaryRupees).toLocaleString("en-IN")}</span>
                      </div>
                    </div>

                    {unpaidLopDays > 0 && (
                      <div className="flex items-center gap-2 pt-2 border-t border-emerald-200/60">
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 rounded-lg shadow-2xs cursor-pointer"
                          onClick={applySyncedNetSalary}
                        >
                          <Check className="h-3.5 w-3.5" /> Auto-Fill Net (₹{Math.round(syncedNetSalaryRupees).toLocaleString("en-IN")})
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-300 font-semibold rounded-lg shadow-2xs cursor-pointer"
                          onClick={applyBaseSalary}
                        >
                          Use Base Salary (₹{Math.round(baseSalaryRupees).toLocaleString("en-IN")})
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Monthly Paid Alert Banner */}
            {isSelectedPaidForMonth && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2.5">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Salary Already Disbursed:</strong> Monthly salary payout for <strong>{selectedEmployee?.name}</strong> for <strong>{selectedMonthPeriod}</strong> has already been recorded.
                </span>
              </div>
            )}

            {/* Category Pill Selection */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Payment Category</FormLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "salary", label: "Monthly Salary" },
                      { id: "advance", label: "Advance Salary" },
                      { id: "bonus", label: "Bonus / Incentive" },
                      { id: "deduction", label: "Deduction" },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => field.onChange(cat.id)}
                        className={cn(
                          "py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer",
                          field.value === cat.id
                            ? "bg-emerald-800 text-white border-emerald-800 shadow-xs"
                            : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                        )}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount & Date Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Payout Amount (₹) *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-zinc-400">₹</span>
                        <Input
                          type="number"
                          placeholder="Amount in ₹"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          className="h-10 pl-7 text-sm font-extrabold text-zinc-900 border-zinc-200"
                        />
                      </div>
                    </FormControl>
                    {formAmount > 0 && (
                      <div className="text-[11px] font-semibold text-emerald-700 mt-1">
                        Amount in words: <span className="italic font-bold">{inWordsINR(formAmount)}</span>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monthPeriod"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-bold text-zinc-700 uppercase tracking-wider">For Month (Period)</FormLabel>
                    <FormControl>
                      <Input
                        type="month"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          if (selectedEmployee) {
                            const periodText = e.target.value ? `for ${e.target.value}` : "";
                            form.setValue("note", `Salary payout ${periodText} - ${selectedEmployee.name}`);
                          }
                        }}
                        className="h-10 w-full px-3 text-sm border-zinc-200"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Payment Mode Pills & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentMode"
                render={({ field }) => (
                  <FormItem className="space-y-1.5 sm:col-span-2">
                    <FormLabel className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Payment Mode</FormLabel>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: "bank_transfer", label: "Bank Transfer", icon: CreditCard },
                        { id: "upi", label: "UPI Transfer", icon: Wallet },
                        { id: "cash", label: "Cash Payment", icon: Banknote },
                        { id: "cheque", label: "Cheque", icon: Receipt },
                      ].map((mode) => {
                        const Icon = mode.icon;
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => field.onChange(mode.id)}
                            className={cn(
                              "py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                              field.value === mode.id
                                ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                                : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {mode.label}
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Disbursement Date</FormLabel>
                    <FormControl>
                      <Input type="date" value={field.value} onChange={field.onChange} className="h-10 text-sm border-zinc-200" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="referenceNo"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Ref / UTR Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. UTR123456789" value={field.value ?? ""} onChange={field.onChange} className="h-10 text-sm border-zinc-200" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Remarks / Notes</FormLabel>
                  <FormControl>
                    <Input placeholder="Payment notes" value={field.value ?? ""} onChange={field.onChange} className="h-10 text-sm border-zinc-200" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Live Amount in Words Preview Banner */}
            {formAmount > 0 && (
              <div className="p-3 bg-emerald-50/80 border border-emerald-200/90 rounded-lg text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-emerald-950 font-medium">
                  Amount in words: <strong className="text-emerald-900 font-bold">{inWordsINR(rupeesToPaise(formAmount))}</strong>
                </span>
                <span className="font-mono font-bold text-emerald-800 text-sm">{formatINR(rupeesToPaise(formAmount))}</span>
              </div>
            )}

            <DialogFooter className="pt-4 border-t border-zinc-100 flex-row items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-full px-6 text-xs font-medium">
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-full px-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Saving Payout..." : "Confirm & Record Payout"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Employee Profile & Digital ID Card Modal ---------------- */

interface ProfileModalProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EmployeeProfileModal({ employee, open, onOpenChange }: ProfileModalProps) {
  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[650px] p-0 gap-0 overflow-hidden rounded-xl">
        <DialogHeader className="px-6 py-4 border-b border-zinc-100 bg-white flex-row items-center justify-between pr-12">
          <div>
            <DialogTitle className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-600" />
              Staff Profile &amp; ID Card
            </DialogTitle>
            <p className="text-xs text-zinc-500 mt-0.5">{employee.code ? `ID: ${employee.code}` : "Official Employee Record"}</p>
          </div>
          <Button
            size="sm"
            onClick={() => window.print()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-semibold rounded-lg px-3.5 h-8 border-0 shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" /> Print Profile
          </Button>
        </DialogHeader>

        <div className="p-6 overflow-y-auto max-h-[75vh] space-y-6">
          {/* Top Profile Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-zinc-50 to-emerald-50/40 border border-zinc-200/80 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-emerald-600 text-white flex items-center justify-center text-2xl font-bold uppercase shadow-xs shrink-0">
                {employee.name.slice(0, 2)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900">{employee.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="bg-white text-zinc-700 border-zinc-250 text-xs font-semibold">
                    {employee.role || "Staff"}
                  </Badge>
                  {employee.department && (
                    <Badge variant="secondary" className="bg-emerald-100/80 text-emerald-800 text-xs">
                      {employee.department}
                    </Badge>
                  )}
                  <Badge className={cn("text-[10px] uppercase font-bold", employee.status === "active" ? "bg-green-600" : "bg-zinc-500")}>
                    {employee.status}
                  </Badge>
                </div>
              </div>
            </div>
            {employee.salary && (
              <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-200 w-full sm:w-auto">
                <div className="text-[10px] font-bold uppercase text-zinc-400">Monthly Salary</div>
                <div className="text-lg font-bold text-zinc-900">{formatINR(employee.salary)}</div>
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <Card className="p-4 border-zinc-200">
              <h4 className="font-bold text-zinc-900 border-b border-zinc-100 pb-2 mb-3 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-zinc-500" /> Contact Details
              </h4>
              <div className="space-y-2">
                <div><span className="text-zinc-400">Phone:</span> <span className="font-medium text-zinc-800">{employee.phone || "—"}</span></div>
                <div><span className="text-zinc-400">Email:</span> <span className="font-medium text-zinc-800">{employee.email || "—"}</span></div>
                <div><span className="text-zinc-400">Address:</span> <span className="font-medium text-zinc-800">{employee.address || "—"}</span></div>
              </div>
            </Card>

            <Card className="p-4 border-zinc-200">
              <h4 className="font-bold text-zinc-900 border-b border-zinc-100 pb-2 mb-3 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-zinc-500" /> Identifiers &amp; HR
              </h4>
              <div className="space-y-2">
                <div><span className="text-zinc-400">Joining Date:</span> <span className="font-medium text-zinc-800">{employee.joiningDate || "—"}</span></div>
                <div><span className="text-zinc-400">PAN Card:</span> <span className="font-medium text-zinc-800 uppercase">{employee.panNo || "—"}</span></div>
                <div><span className="text-zinc-400">Aadhaar:</span> <span className="font-medium text-zinc-800">{employee.aadhaarNo || "—"}</span></div>
                <div><span className="text-zinc-400">Emergency:</span> <span className="font-medium text-zinc-800">{employee.emergencyContactName ? `${employee.emergencyContactName} (${employee.emergencyContactPhone || ""})` : "—"}</span></div>
              </div>
            </Card>

            <Card className="p-4 border-zinc-200 sm:col-span-2">
              <h4 className="font-bold text-zinc-900 border-b border-zinc-100 pb-2 mb-3 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-zinc-500" /> Bank &amp; Payment Accounts
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div><div className="text-zinc-400">Bank Name</div><div className="font-semibold text-zinc-800">{employee.bankName || "—"}</div></div>
                <div><div className="text-zinc-400">Account No</div><div className="font-semibold text-zinc-800">{employee.accountNo || "—"}</div></div>
                <div><div className="text-zinc-400">IFSC Code</div><div className="font-semibold text-zinc-800 uppercase">{employee.ifscCode || "—"}</div></div>
                <div><div className="text-zinc-400">UPI ID</div><div className="font-semibold text-zinc-800">{employee.upiId || "—"}</div></div>
              </div>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Printable Pay Slip Modal ---------------- */

interface PaySlipModalProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function PaySlipModal({ employee, open, onOpenChange }: PaySlipModalProps) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const { data: business } = useQuery({
    queryKey: ["business"],
    queryFn: () => api.get<Business>("/api/business/current"),
  });

  if (!employee) return null;

  const monthlySalary = employee.salary ? paiseToRupees(employee.salary) : 0;
  const basicSalary = Math.round(monthlySalary * 0.5); // 50% basic
  const hra = Math.round(monthlySalary * 0.3); // 30% HRA
  const specialAllowance = monthlySalary - basicSalary - hra; // 20% Special allowance
  const grossEarnings = monthlySalary;
  
  // Standard statutory deductions
  const pfDeduction = basicSalary >= 15000 ? 1800 : Math.round(basicSalary * 0.12);
  const ptDeduction = monthlySalary >= 15000 ? 200 : 0;
  const totalDeductions = pfDeduction + ptDeduction;
  const netSalary = Math.max(0, grossEarnings - totalDeductions);

  const companyName = business?.name || "YOUR COMPANY NAME";
  const slipRefNo = `SLIP/${selectedMonth.replace("-", "")}/${employee.code || employee.id.slice(0, 6).toUpperCase()}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[750px] p-0 gap-0 overflow-hidden rounded-xl border border-zinc-200">
        <DialogHeader className="px-6 py-4 border-b border-zinc-100 bg-white flex-row items-center justify-between pr-12">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-600" />
            <DialogTitle className="text-lg font-bold text-zinc-900">Salary Payslip</DialogTitle>
          </div>
          <div className="flex items-center gap-2.5">
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-8 w-44 px-3 text-xs bg-white text-zinc-900 border-zinc-200 shadow-xs focus-visible:ring-1"
            />
            <Button
              size="sm"
              onClick={() => window.print()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-semibold rounded-lg px-3.5 h-8 border-0 shadow-xs cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 bg-white overflow-y-auto max-h-[78vh] space-y-5 text-xs text-zinc-800">
          {/* Company & Header Banner */}
          <div className="border border-zinc-200 rounded-xl p-5 bg-gradient-to-r from-zinc-50 via-white to-emerald-50/30 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-200/80 pb-4">
              <div className="flex items-center gap-3.5">
                {business?.logoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={business.logoUrl} alt={companyName} className="h-12 w-12 object-contain rounded-md border border-zinc-200 bg-white p-1" />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-zinc-900 text-white font-extrabold text-lg flex items-center justify-center shadow-xs shrink-0">
                    {companyName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-base font-extrabold text-zinc-900 uppercase tracking-wide">{companyName}</h2>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {business?.address ? `${business.address}` : "Corporate Office Address"}
                    {business?.stateName ? `, ${business.stateName}` : ""}
                    {business?.pincode ? ` - ${business.pincode}` : ""}
                  </p>
                  {(business?.phone || business?.email) && (
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {business.phone ? `Ph: ${business.phone}` : ""} {business.email ? `| Email: ${business.email}` : ""}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-200 w-full sm:w-auto">
                <div className="inline-block bg-emerald-100/80 text-emerald-900 font-bold px-2.5 py-1 rounded text-[11px] uppercase tracking-wider">
                  PAYSLIP
                </div>
                <div className="text-[11px] font-semibold text-zinc-700 mt-1">Period: {selectedMonth}</div>
                <div className="text-[10px] font-mono text-zinc-400 mt-0.5">Ref: {slipRefNo}</div>
              </div>
            </div>

            {/* Business GST & PAN details if available */}
            {(business?.gstin || business?.pan) && (
              <div className="flex items-center gap-4 text-[10px] text-zinc-500 pt-2 font-mono">
                {business.gstin && <span>GSTIN: <strong className="text-zinc-800">{business.gstin}</strong></span>}
                {business.pan && <span>PAN: <strong className="text-zinc-800 uppercase">{business.pan}</strong></span>}
              </div>
            )}
          </div>

          {/* 2-Column Employee & Bank Info Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50/50 space-y-1.5">
              <div className="font-bold text-zinc-900 border-b border-zinc-200/80 pb-1 mb-2 text-[11px] uppercase tracking-wider text-emerald-800">
                Employee Information
              </div>
              <div className="flex justify-between"><span className="text-zinc-500">Employee Code:</span><span className="font-semibold text-zinc-900">{employee.code || "EMP-001"}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Employee Name:</span><span className="font-bold text-zinc-900">{employee.name}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Designation:</span><span className="font-medium text-zinc-800">{employee.role || "Staff Member"}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Department:</span><span className="font-medium text-zinc-800">{employee.department || "General"}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Date of Joining:</span><span className="font-medium text-zinc-800">{employee.joiningDate || "—"}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">PAN / Aadhaar:</span><span className="font-medium text-zinc-800 uppercase">{employee.panNo || employee.aadhaarNo || "—"}</span></div>
            </div>

            <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50/50 space-y-1.5">
              <div className="font-bold text-zinc-900 border-b border-zinc-200/80 pb-1 mb-2 text-[11px] uppercase tracking-wider text-emerald-800">
                Payment &amp; Attendance Details
              </div>
              <div className="flex justify-between"><span className="text-zinc-500">Bank Name:</span><span className="font-semibold text-zinc-900">{employee.bankName || "Direct Transfer / Cash"}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Account Number:</span><span className="font-mono text-zinc-900">{employee.accountNo || "—"}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">IFSC Code:</span><span className="font-mono uppercase text-zinc-900">{employee.ifscCode || "—"}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">UPI VPA:</span><span className="font-medium text-zinc-800">{employee.upiId || "—"}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Total Days in Month:</span><span className="font-medium text-zinc-800">30 Days</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Payable Days:</span><span className="font-bold text-emerald-700">30 Days</span></div>
            </div>
          </div>

          {/* Earnings & Deductions Dual Table */}
          <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="grid grid-cols-2 bg-zinc-900 text-white font-bold text-xs p-2.5">
              <div>EARNINGS &amp; ALLOWANCES</div>
              <div>DEDUCTIONS</div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-zinc-200 text-xs">
              {/* Earnings Column */}
              <div className="divide-y divide-zinc-150">
                <div className="flex justify-between p-2.5">
                  <span className="text-zinc-600">Basic Salary (50%)</span>
                  <span className="font-semibold tabular-nums text-zinc-900">{formatINR(rupeesToPaise(basicSalary))}</span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-zinc-600">House Rent Allowance (HRA 30%)</span>
                  <span className="font-semibold tabular-nums text-zinc-900">{formatINR(rupeesToPaise(hra))}</span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-zinc-600">Special &amp; Conveyance Allowance</span>
                  <span className="font-semibold tabular-nums text-zinc-900">{formatINR(rupeesToPaise(specialAllowance))}</span>
                </div>
                <div className="flex justify-between p-2.5 bg-zinc-50 font-bold text-zinc-900 border-t border-zinc-200">
                  <span>Gross Earnings (A)</span>
                  <span className="tabular-nums">{formatINR(rupeesToPaise(grossEarnings))}</span>
                </div>
              </div>

              {/* Deductions Column */}
              <div className="divide-y divide-zinc-150 bg-zinc-50/30">
                <div className="flex justify-between p-2.5">
                  <span className="text-zinc-600">Provident Fund (PF)</span>
                  <span className="font-semibold tabular-nums text-zinc-900">{formatINR(rupeesToPaise(pfDeduction))}</span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-zinc-600">Professional Tax (PT)</span>
                  <span className="font-semibold tabular-nums text-zinc-900">{formatINR(rupeesToPaise(ptDeduction))}</span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-zinc-600">Income Tax (TDS) / Unpaid Leaves</span>
                  <span className="font-semibold tabular-nums text-zinc-900">₹0.00</span>
                </div>
                <div className="flex justify-between p-2.5 bg-zinc-50 font-bold text-zinc-900 border-t border-zinc-200">
                  <span>Total Deductions (B)</span>
                  <span className="tabular-nums">{formatINR(rupeesToPaise(totalDeductions))}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Salary Summary & In Words Banner */}
          <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider">NET SALARY PAYABLE (A - B)</div>
              <div className="text-xs font-semibold text-emerald-950 mt-1">
                Amount in words: <em className="not-italic text-emerald-900 font-bold">{inWordsINR(rupeesToPaise(netSalary))}</em>
              </div>
            </div>
            <div className="text-left sm:text-right w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-200">
              <div className="text-2xl font-black text-emerald-900 tabular-nums tracking-tight">
                {formatINR(rupeesToPaise(netSalary))}
              </div>
            </div>
          </div>

          {/* Legal Compliance Footer & Signatures */}
          <div className="pt-4 border-t border-zinc-200 space-y-6">
            <p className="text-[10px] text-zinc-400 italic text-center">
              Confidential — This document is a computer-generated salary payslip issued by <strong>{companyName}</strong>.
              No physical signature is required under section 65B of the Information Technology Act.
            </p>

            <div className="flex items-end justify-between pt-4 text-xs text-zinc-700">
              <div className="text-center">
                <div className="border-b border-dashed border-zinc-300 w-40 mb-1"></div>
                <div className="text-[11px] font-semibold">Employee Signature</div>
              </div>

              <div className="text-center">
                {business?.signatureUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={business.signatureUrl} alt="Signature" className="h-10 object-contain mx-auto mb-1" />
                ) : (
                  <div className="border-b border-dashed border-zinc-300 w-44 mb-1"></div>
                )}
                <div className="text-[11px] font-bold text-zinc-900">For {companyName}</div>
                <div className="text-[10px] text-zinc-400">Authorized Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ========================================================================
   MAIN EMPLOYEES PAGE
   ======================================================================== */

export default function EmployeesPage() {
  const qc = useQueryClient();
  const todayDate = new Date().toISOString().split("T")[0] ?? "";

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [profileEmployee, setProfileEmployee] = useState<Employee | null>(null);
  const [payslipEmployee, setPayslipEmployee] = useState<Employee | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentEmpId, setPaymentEmpId] = useState<string | undefined>(undefined);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "active" | "inactive">("active");
  const [attendanceDate, setAttendanceDate] = useState<string>(todayDate);
  const [attendanceViewMode, setAttendanceViewMode] = useState<"daily" | "monthly" | "auditor">("daily");
  const [attendanceMonth, setAttendanceMonth] = useState<string>(todayDate.slice(0, 7));
  const [selectedAuditorEmpId, setSelectedAuditorEmpId] = useState<string>("");
  const [mainTab, setMainTab] = useState<"directory" | "attendance" | "payments">("directory");

  /* ---------------- Queries ---------------- */

  const { data: employees, isLoading, error } = useQuery({
    queryKey: ["employees"],
    queryFn: () => api.get<Employee[]>("/api/employees"),
  });

  const { data: attendances } = useQuery({
    queryKey: ["employee-attendance", attendanceDate],
    queryFn: () => api.get<EmployeeAttendance[]>(`/api/employees/attendance?date=${attendanceDate}`),
  });

  const { data: monthlyAttendances } = useQuery({
    queryKey: ["employee-attendance-monthly", attendanceMonth],
    queryFn: () => api.get<EmployeeAttendance[]>(`/api/employees/attendance?month=${attendanceMonth}`),
    enabled: mainTab === "attendance",
  });

  const { data: payments } = useQuery({
    queryKey: ["employee-payments"],
    queryFn: () => api.get<(EmployeePayment & { employee?: { name: string; role?: string } })[]>("/api/employees/payments"),
  });

  /* ---------------- Mutations ---------------- */

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/api/employees/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee profile deleted");
    },
    onError: () => toast.error("Could not delete employee"),
  });

  const markAttendanceMutation = useMutation({
    mutationFn: (payload: { employeeId: string; date: string; status: "present" | "absent" | "half_day" | "paid_leave" }) =>
      api.post<EmployeeAttendance>("/api/employees/attendance", payload),
    // ── Optimistic update: flip the button immediately, sync in background ──
    onMutate: async (payload) => {
      // Cancel any in-flight refetches so they don't overwrite our optimistic value
      await qc.cancelQueries({ queryKey: ["employee-attendance", attendanceDate] });

      // Snapshot the previous value so we can roll back on error
      const prev = qc.getQueryData<EmployeeAttendance[]>(["employee-attendance", attendanceDate]);

      // Optimistically update the cache right now
      qc.setQueryData<EmployeeAttendance[]>(["employee-attendance", attendanceDate], (old = []) => {
        const existing = old.find((a) => a.employeeId === payload.employeeId && a.date === payload.date);
        if (existing) {
          return old.map((a) =>
            a.employeeId === payload.employeeId && a.date === payload.date
              ? { ...a, status: payload.status }
              : a
          );
        }
        // New record — insert a temporary entry
        return [
          ...old,
          {
            id: `optimistic-${payload.employeeId}`,
            employeeId: payload.employeeId,
            businessId: "",
            date: payload.date,
            status: payload.status,
            note: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as EmployeeAttendance,
        ];
      });

      return { prev };
    },
    onError: (_err, _payload, context) => {
      // Roll back on failure
      if (context?.prev !== undefined) {
        qc.setQueryData(["employee-attendance", attendanceDate], context.prev);
      }
      toast.error("Could not save attendance — please try again");
    },
    onSettled: () => {
      // Always re-sync from server after mutation settles
      qc.invalidateQueries({ queryKey: ["employee-attendance"] });
      qc.invalidateQueries({ queryKey: ["employee-attendance-monthly"] });
    },
  });

  const bulkMarkMutation = useMutation({
    mutationFn: (payload: { date: string; status?: string }) =>
      api.post("/api/employees/attendance/bulk", payload),
    // ── Optimistic: mark all active employees present instantly ──
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ["employee-attendance", attendanceDate] });
      const prev = qc.getQueryData<EmployeeAttendance[]>(["employee-attendance", attendanceDate]);
      const activeIds = employeeList.filter((e) => e.status === "active").map((e) => e.id);
      const status = (payload.status ?? "present") as EmployeeAttendance["status"];

      qc.setQueryData<EmployeeAttendance[]>(["employee-attendance", attendanceDate], (old = []) => {
        const updated = [...old];
        for (const empId of activeIds) {
          const idx = updated.findIndex((a) => a.employeeId === empId && a.date === payload.date);
          if (idx >= 0) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            updated[idx] = { ...updated[idx]!, status } as EmployeeAttendance;
          } else {
            updated.push({
              id: `optimistic-bulk-${empId}`,
              employeeId: empId,
              businessId: "",
              date: payload.date,
              status,
              note: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as EmployeeAttendance);
          }
        }
        return updated;
      });

      return { prev };
    },
    onSuccess: () => toast.success("All active staff marked Present!"),
    onError: (_err, _payload, context) => {
      if (context?.prev !== undefined) {
        qc.setQueryData(["employee-attendance", attendanceDate], context.prev);
      }
      toast.error("Could not complete bulk attendance");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["employee-attendance"] });
      qc.invalidateQueries({ queryKey: ["employee-attendance-monthly"] });
    },
  });

  const employeeList = employees ?? [];
  const attendanceList = attendances ?? [];
  const paymentList = payments ?? [];

  // Stats calculation
  const totalEmployees = employeeList.length;
  const activeStaff = employeeList.filter((e) => e.status === "active").length;
  const pastEmployees = employeeList.filter((e) => e.status === "inactive").length;
  const monthlyPayroll = employeeList
    .filter((e) => e.status === "active" && e.salary)
    .reduce((sum, e) => sum + (e.salary ?? 0), 0);

  // Client filtering for directory
  const filteredRows = employeeList.filter((e) => {
    if (selectedStatus !== "all" && e.status !== selectedStatus) return false;
    if (selectedDept !== "all" && e.department !== selectedDept) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = e.name.toLowerCase().includes(q);
      const codeMatch = e.code?.toLowerCase().includes(q) ?? false;
      const roleMatch = e.role?.toLowerCase().includes(q) ?? false;
      const phoneMatch = e.phone?.toLowerCase().includes(q) ?? false;
      return nameMatch || codeMatch || roleMatch || phoneMatch;
    }
    return true;
  });

  const currentMonthStr = todayDate.slice(0, 7);

  /* ---------------- DataTable Columns ---------------- */

  const columns: Column<Employee>[] = [
    {
      key: "name",
      header: "Employee & Code",
      cell: (e) => {
        const isPaidThisMonth = paymentList.some(
          (p) => p.employeeId === e.id && p.type === "salary" && p.monthPeriod === currentMonthStr
        );

        return (
          <div className="min-w-0">
            <div className="font-semibold text-zinc-900 flex items-center gap-1.5 flex-wrap">
              {e.name}
              {e.code && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 border border-zinc-200 text-zinc-600 font-normal">
                  {e.code}
                </span>
              )}
              {isPaidThisMonth && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded flex items-center gap-1">
                  <Check className="h-3 w-3" /> Paid ({currentMonthStr})
                </span>
              )}
            </div>
            {(e.phone || e.email) && (
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
                {e.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {e.phone}
                  </span>
                )}
                {e.phone && e.email && <span>·</span>}
                {e.email && <span>{e.email}</span>}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "department",
      header: "Role",
      cell: (e) => (
        <span className="text-xs font-semibold text-zinc-700 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded">
          {e.role || "Staff"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (e) => (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border",
            e.status === "active"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-zinc-100 text-zinc-600 border-zinc-200"
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", e.status === "active" ? "bg-emerald-500" : "bg-zinc-400")} />
          {e.status === "active" ? "Active" : "Relieved"}
        </span>
      ),
    },
    {
      key: "joiningDate",
      header: "Joining Date",
      cell: (e) => (
        <span className="text-xs text-zinc-500">
          {e.joiningDate || "—"}
        </span>
      ),
    },
    {
      key: "salary",
      header: "Monthly Salary",
      align: "right",
      cell: (e) => {
        const sal = e.salary ?? 0;
        if (sal === 0) return <span className="text-sm text-zinc-400">—</span>;
        return <span className="text-sm font-semibold tabular-nums text-zinc-900">{formatINR(sal)}</span>;
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (e) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setProfileEmployee(e)}>
              <User className="mr-2 h-4 w-4 text-zinc-500" />
              View ID Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPayslipEmployee(e)}>
              <Receipt className="mr-2 h-4 w-4 text-emerald-600" />
              Generate Payslip
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setPaymentEmpId(e.id); setIsPaymentOpen(true); }}>
              <Wallet className="mr-2 h-4 w-4 text-blue-600" />
              Record Payout
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditingEmployee(e)}>
              <Pencil className="mr-2 h-4 w-4 text-zinc-500" />
              Edit details
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => remove.mutate(e.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete record
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <main className="mx-auto max-w-[1600px] px-4 sm:px-6 py-6 sm:py-8">
      {/* Breadcrumb link */}
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition">
          <ArrowLeft className="h-3 w-3" /> Back to Dashboard
        </Link>
      </div>

      <PageHeader
        title="Employees &amp; Team Directory"
        description="Manage team members, roles, attendance logs, and monthly disbursements."
        backHref="/"
        backLabel="Dashboard"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-1.5 border-zinc-300 text-zinc-700 hover:bg-zinc-50 rounded-lg text-xs font-semibold"
            onClick={() => { setPaymentEmpId(undefined); setIsPaymentOpen(true); }}
          >
            <Wallet className="h-4 w-4 text-emerald-600" />
            Record Payout
          </Button>

          <EmployeeDialog
            open={isAddOpen}
            onOpenChange={setIsAddOpen}
            trigger={
              <Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs">
                <Plus className="h-4 w-4" />
                Add Employee
              </Button>
            }
          />
        </div>
      </PageHeader>

      {/* Cohesive Enterprise Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 mt-6">
        <Card
          onClick={() => setSelectedStatus("active")}
          className={cn(
            "border shadow-2xs rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all bg-white hover:border-emerald-500",
            selectedStatus === "active" ? "border-emerald-600 ring-1 ring-emerald-600/30 bg-emerald-50/20" : "border-zinc-200/90"
          )}
        >
          <div>
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Active Staff</div>
            <div className="text-2xl font-black text-zinc-900 mt-0.5">{activeStaff}</div>
            <div className="text-xs text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Currently working
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck className="h-5 w-5" />
          </div>
        </Card>

        <Card
          onClick={() => setSelectedStatus("all")}
          className={cn(
            "border shadow-2xs rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all bg-white hover:border-zinc-400",
            selectedStatus === "all" ? "border-zinc-800 ring-1 ring-zinc-800/20 bg-zinc-50/50" : "border-zinc-200/90"
          )}
        >
          <div>
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Headcount</div>
            <div className="text-2xl font-black text-zinc-900 mt-0.5">{totalEmployees}</div>
            <div className="text-xs text-zinc-500 font-medium mt-0.5">Active &amp; past records</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-600 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
        </Card>

        <Card className="border border-zinc-200/90 shadow-2xs rounded-xl bg-white p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Monthly Base Payroll</div>
            <div className="text-2xl font-black text-zinc-900 mt-0.5">{formatINR(monthlyPayroll)}</div>
            <div className="text-xs text-emerald-600 font-semibold mt-0.5">Active staff base salaries</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Wallet className="h-5 w-5" />
          </div>
        </Card>

        <Card
          onClick={() => setSelectedStatus("inactive")}
          className={cn(
            "border shadow-2xs rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all bg-white hover:border-zinc-400",
            selectedStatus === "inactive" ? "border-zinc-800 ring-1 ring-zinc-800/20 bg-zinc-50/50" : "border-zinc-200/90"
          )}
        >
          <div>
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Relieved Employees</div>
            <div className="text-2xl font-black text-zinc-900 mt-0.5">{pastEmployees}</div>
            <div className="text-xs text-zinc-500 font-medium mt-0.5">Past staff records</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-500 flex items-center justify-center shrink-0">
            <UserMinus className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs defaultValue="directory" value={mainTab} onValueChange={(val) => setMainTab(val as "directory" | "attendance" | "payments")} className="w-full">
        <TabsList className="h-11 bg-zinc-100/80 p-1 mb-6 rounded-lg gap-2">
          <TabsTrigger value="directory" className="text-xs font-semibold px-4 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-xs">
            <Users className="h-3.5 w-3.5 mr-1.5" /> Staff Directory
          </TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs font-semibold px-4 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-xs">
            <Calendar className="h-3.5 w-3.5 mr-1.5" /> Daily Attendance Register
          </TabsTrigger>
          <TabsTrigger value="payments" className="text-xs font-semibold px-4 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-xs">
            <Wallet className="h-3.5 w-3.5 mr-1.5" /> Salary &amp; Payout Log
          </TabsTrigger>
        </TabsList>

        {/* Directory Tab */}
        <TabsContent value="directory" className="m-0 space-y-4">
          {/* Consolidated Search & Filter Toolbar */}
          <div className="bg-white p-3.5 border border-zinc-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
            {/* Left: Search Bar */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search by code, name, designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 h-9 text-xs border-zinc-200 rounded-lg placeholder-zinc-400 bg-white focus:ring-emerald-500"
              />
            </div>

            {/* Right: Segmented Status Controls & Department Dropdown */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg border border-zinc-200">
                <button
                  onClick={() => setSelectedStatus("active")}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    selectedStatus === "active" ? "bg-white text-emerald-800 shadow-2xs border border-zinc-200" : "text-zinc-600 hover:text-zinc-900"
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active ({activeStaff})
                </button>
                <button
                  onClick={() => setSelectedStatus("inactive")}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    selectedStatus === "inactive" ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200" : "text-zinc-600 hover:text-zinc-900"
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" /> Relieved ({pastEmployees})
                </button>
                <button
                  onClick={() => setSelectedStatus("all")}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                    selectedStatus === "all" ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200" : "text-zinc-600 hover:text-zinc-900"
                  )}
                >
                  All ({totalEmployees})
                </button>
              </div>

              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="h-9 px-3 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="all">All Departments</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept} Department
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DataTable
            columns={columns}
            rows={filteredRows}
            getRowKey={(e) => e.id}
            isLoading={isLoading}
            error={error}
            emptyMessage="No employees found matching filters. Add your first employee to get started."
          />
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="m-0 space-y-4">
          {/* 4 Attendance KPI Cards + Bulk Action Bar */}
          {(() => {
            const activeEmps = employeeList.filter((e) => e.status === "active");
            const totalActive = activeEmps.length;
            const presentToday = attendanceList.filter((a) => a.status === "present").length;
            const leavesToday = attendanceList.filter((a) => a.status === "half_day" || a.status === "paid_leave").length;
            const absentToday = attendanceList.filter((a) => a.status === "absent").length;
            const ratePercent = totalActive > 0 ? Math.round((presentToday / totalActive) * 100) : 0;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 text-white p-4 rounded-xl shadow-sm border border-emerald-800">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">Today&apos;s Attendance Rate</div>
                  <div className="text-2xl font-black mt-1 flex items-baseline justify-between">
                    <span>{ratePercent}%</span>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-800/80 rounded-full text-emerald-200">
                      {presentToday}/{totalActive} Staff
                    </span>
                  </div>
                  <div className="text-[10px] text-emerald-300/80 mt-1">Live synchronized presence metric</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Present Today
                  </div>
                  <div className="text-2xl font-bold text-zinc-900 mt-1">{presentToday}</div>
                  <div className="text-[11px] text-emerald-600 font-semibold mt-1">On-duty active staff</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> Half Day / Leave
                  </div>
                  <div className="text-2xl font-bold text-zinc-900 mt-1">{leavesToday}</div>
                  <div className="text-[11px] text-amber-600 font-semibold mt-1">Approved leaves / partial day</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> Absent Today
                  </div>
                  <div className="text-2xl font-bold text-zinc-900 mt-1">{absentToday}</div>
                  <div className="text-[11px] text-red-600 font-semibold mt-1">Unexcused / LOP Risk</div>
                </div>
              </div>
            );
          })()}

          {/* Sub-Views Control Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 border border-zinc-200 rounded-xl shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-zinc-900 text-sm">Attendance &amp; Payroll Audit Suite</h4>
                <p className="text-xs text-zinc-500">3-view audit engine with LOP calculation &amp; weekend auto-detector.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* 3 Sub-View Switcher Pills */}
              <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg border border-zinc-200">
                <button
                  onClick={() => setAttendanceViewMode("daily")}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                    attendanceViewMode === "daily" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-600 hover:text-zinc-900"
                  )}
                >
                  Daily Logger
                </button>
                <button
                  onClick={() => setAttendanceViewMode("monthly")}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                    attendanceViewMode === "monthly" ? "bg-emerald-600 text-white shadow-2xs" : "text-emerald-700 hover:bg-emerald-50"
                  )}
                >
                  Monthly Matrix &amp; Heatmap
                </button>
                <button
                  onClick={() => setAttendanceViewMode("auditor")}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                    attendanceViewMode === "auditor" ? "bg-zinc-900 text-white shadow-2xs" : "text-zinc-600 hover:text-zinc-900"
                  )}
                >
                  LOP &amp; Salary Auditor
                </button>
              </div>

              {attendanceViewMode === "daily" && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5 shadow-2xs cursor-pointer"
                    onClick={() => bulkMarkMutation.mutate({ date: attendanceDate, status: "present" })}
                    disabled={bulkMarkMutation.isPending}
                  >
                    <Check className="h-3.5 w-3.5" /> Mark All Present Today
                  </Button>
                  <Input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="h-8 w-36 text-xs border-zinc-200 bg-white"
                  />
                </div>
              )}

              {attendanceViewMode === "monthly" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-500 uppercase whitespace-nowrap">Month:</span>
                  <Input
                    type="month"
                    value={attendanceMonth}
                    onChange={(e) => setAttendanceMonth(e.target.value)}
                    className="h-8 w-40 text-xs border-zinc-200 bg-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* VIEW 1: DAILY LOGGER */}
          {attendanceViewMode === "daily" && (
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-100">
              {employeeList.filter((e) => e.status === "active").map((emp) => {
                const record = attendanceList.find((a) => a.employeeId === emp.id);
                const currentStatus = record?.status || "present";

                return (
                  <div key={emp.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/50">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-zinc-100 text-zinc-700 font-bold text-xs flex items-center justify-center border border-zinc-200">
                        {emp.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-zinc-900 flex items-center gap-2">
                          {emp.name}
                          {emp.code && <span className="text-[10px] text-zinc-400">({emp.code})</span>}
                          {emp.department && <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200">{emp.department}</Badge>}
                        </div>
                        <div className="text-xs text-zinc-500">{emp.role || "Staff"}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {(["present", "absent", "half_day", "paid_leave"] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => markAttendanceMutation.mutate({
                            employeeId: emp.id,
                            date: attendanceDate,
                            status,
                          })}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border capitalize cursor-pointer",
                            currentStatus === status
                              ? status === "present" ? "bg-green-600 text-white border-green-600 shadow-2xs"
                                : status === "absent" ? "bg-red-600 text-white border-red-600 shadow-2xs"
                                : status === "half_day" ? "bg-amber-500 text-white border-amber-500 shadow-2xs"
                                : "bg-blue-600 text-white border-blue-600 shadow-2xs"
                              : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                          )}
                        >
                          {status.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 2: MONTHLY MATRIX & HEATMAP */}
          {attendanceViewMode === "monthly" && (
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden p-4 space-y-4">
              <div className="text-xs text-zinc-500 flex items-center justify-between border-b border-zinc-100 pb-3">
                <span className="font-semibold text-zinc-700">Monthly Attendance &amp; Weekend Heatmap for {attendanceMonth}</span>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Present (P)</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Half Day (HD)</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Paid Leave (PL)</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Absent (A)</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-zinc-300" /> Weekend (OFF)</span>
                </div>
              </div>

              <div className="space-y-4 divide-y divide-zinc-100">
                {employeeList.filter((e) => e.status === "active").map((emp) => {
                  const empLogs = (monthlyAttendances || []).filter((a) => a.employeeId === emp.id);
                  const presentCount = empLogs.filter((a) => a.status === "present").length;
                  const halfDayCount = empLogs.filter((a) => a.status === "half_day").length;
                  const paidLeaveCount = empLogs.filter((a) => a.status === "paid_leave").length;
                  const absentCount = empLogs.filter((a) => a.status === "absent").length;
                  const totalLoggedDays = presentCount + halfDayCount + paidLeaveCount + absentCount;

                  const [y, m] = attendanceMonth.split("-");
                  const daysInMonthCount = new Date(Number(y), Number(m), 0).getDate();
                  const effectiveDays = presentCount + halfDayCount * 0.5 + paidLeaveCount;
                  const scorePercent = totalLoggedDays > 0 ? Math.round((effectiveDays / Math.max(1, totalLoggedDays)) * 100) : 0;

                  // Anomaly & Absenteeism Risk Detector Algorithm (absent >= 3 or score < 75%)
                  const isHighRisk = absentCount >= 3 || (totalLoggedDays >= 5 && scorePercent < 75);

                  return (
                    <div key={emp.id} className="pt-4 first:pt-0 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {emp.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-zinc-900 flex items-center gap-2">
                              {emp.name}
                              {emp.code && <span className="text-[10px] text-zinc-400 font-mono">({emp.code})</span>}
                              {emp.department && <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200">{emp.department}</Badge>}
                              {isHighRisk && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                                  ⚠️ High LOP Risk
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-500">{emp.role || "Staff"}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                            {presentCount} Present
                          </span>
                          {halfDayCount > 0 && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                              {halfDayCount} Half Days
                            </span>
                          )}
                          {paidLeaveCount > 0 && (
                            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                              {paidLeaveCount} Paid Leaves
                            </span>
                          )}
                          {absentCount > 0 && (
                            <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-800 border border-red-200 font-bold">
                              {absentCount} Days Absent
                            </span>
                          )}
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-white font-black",
                            scorePercent >= 90 ? "bg-emerald-700" : scorePercent >= 75 ? "bg-blue-700" : "bg-red-700"
                          )}>
                            {scorePercent}% {scorePercent >= 90 ? "Excellent" : scorePercent >= 75 ? "Good" : "Attention"}
                          </span>
                        </div>
                      </div>

                      {/* Day-by-Day Calendar Heatmap Grid with Weekend Auto-Detector */}
                      <div className="overflow-x-auto pb-2">
                        <div className="flex items-center gap-1 min-w-[750px]">
                          {Array.from({ length: daysInMonthCount }, (_, i) => i + 1).map((d) => {
                            const dateStr = `${attendanceMonth}-${String(d).padStart(2, "0")}`;
                            const dayDate = new Date(Number(y), Number(m) - 1, d);
                            const isSunday = dayDate.getDay() === 0;
                            const log = empLogs.find((a) => a.date === dateStr);
                            const st = log?.status;
                            const nextStatus: "present" | "half_day" | "paid_leave" | "absent" =
                              st === "present" ? "half_day" : st === "half_day" ? "paid_leave" : st === "paid_leave" ? "absent" : "present";

                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => markAttendanceMutation.mutate({
                                  employeeId: emp.id,
                                  date: dateStr,
                                  status: nextStatus,
                                })}
                                title={`${dateStr} (${isSunday ? "Sunday Weekend" : "Working Day"}): Click to set attendance (Current: ${st ? st.replace("_", " ") : isSunday ? "Weekend OFF" : "Unlogged"})`}
                                className={cn(
                                  "h-8 w-8 rounded-md flex flex-col items-center justify-center text-[10px] font-bold border transition-all shrink-0 cursor-pointer hover:scale-105 active:scale-95 shadow-2xs",
                                  st === "present"
                                    ? "bg-emerald-600 text-white border-emerald-600"
                                    : st === "half_day"
                                    ? "bg-amber-500 text-white border-amber-500"
                                    : st === "paid_leave"
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : st === "absent"
                                    ? "bg-red-600 text-white border-red-600"
                                    : isSunday
                                    ? "bg-zinc-100 text-zinc-400 border-zinc-200"
                                    : "bg-zinc-50 text-zinc-400 border-zinc-200 hover:border-zinc-400 hover:text-zinc-700"
                                )}
                              >
                                <span className="text-[8px] opacity-75">{d}</span>
                                <span className="leading-none">
                                  {st === "present" ? "P" : st === "half_day" ? "HD" : st === "paid_leave" ? "PL" : st === "absent" ? "A" : isSunday ? "OFF" : "-"}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 3: INDIVIDUAL EMPLOYEE DEEP-DIVE & AUTOMATED LOP SALARY AUDITOR */}
          {attendanceViewMode === "auditor" && (
            <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
                <div>
                  <h4 className="font-bold text-zinc-900 text-base">Automated LOP &amp; Salary Deduction Auditor</h4>
                  <p className="text-xs text-zinc-500">Computes net disbursable salary after deducting unpaid Loss of Pay (LOP) days.</p>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-zinc-700">Select Employee:</label>
                  <select
                    value={selectedAuditorEmpId || (employeeList.find((e) => e.status === "active")?.id ?? "")}
                    onChange={(e) => setSelectedAuditorEmpId(e.target.value)}
                    className="h-9 px-3 text-xs border border-zinc-300 rounded-lg font-semibold bg-white text-zinc-900"
                  >
                    {employeeList.filter((e) => e.status === "active").map((e) => (
                      <option key={e.id} value={e.id}>{e.name} ({e.role || "Staff"})</option>
                    ))}
                  </select>
                </div>
              </div>

              {(() => {
                const targetEmpId = selectedAuditorEmpId || employeeList.find((e) => e.status === "active")?.id;
                const emp = employeeList.find((e) => e.id === targetEmpId);
                if (!emp) return <div className="text-xs text-zinc-500">No active employee selected.</div>;

                const empLogs = (monthlyAttendances || []).filter((a) => a.employeeId === emp.id);
                const [y, m] = attendanceMonth.split("-");
                const daysInMonth = new Date(Number(y), Number(m), 0).getDate();

                // Weekend Auto-Detector Algorithm (Sundays = OFF/Holiday)
                let sundayCount = 0;
                for (let d = 1; d <= daysInMonth; d++) {
                  if (new Date(Number(y), Number(m) - 1, d).getDay() === 0) sundayCount++;
                }

                const presentCount = empLogs.filter((a) => a.status === "present").length;
                const halfDayCount = empLogs.filter((a) => a.status === "half_day").length;
                const paidLeaveCount = empLogs.filter((a) => a.status === "paid_leave").length;
                const absentCount = empLogs.filter((a) => a.status === "absent").length;

                // Automated LOP & Payable Days Algorithm
                const payableDays = presentCount + (halfDayCount * 0.5) + paidLeaveCount + sundayCount;
                const unpaidLopDays = Math.max(0, absentCount);
                const baseSalaryRupees = paiseToRupees(emp.salary || 0);
                const perDayRateRupees = baseSalaryRupees / Math.max(1, daysInMonth);
                const lopDeductionRupees = unpaidLopDays * perDayRateRupees;
                const netDisbursableRupees = Math.max(0, baseSalaryRupees - lopDeductionRupees);

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Employee Profile Audit Card */}
                    <div className="bg-zinc-50 p-5 rounded-xl border border-zinc-200 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-zinc-900 text-white font-bold text-sm flex items-center justify-center">
                          {emp.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-base text-zinc-900">{emp.name}</div>
                          <div className="text-xs text-zinc-500">{emp.role || "Staff"} • {emp.department || "General"}</div>
                          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">ID: {emp.code || emp.id.slice(0, 8)}</div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-zinc-200 space-y-2 text-xs">
                        <div className="flex justify-between"><span className="text-zinc-500">Base Monthly Salary:</span><span className="font-bold text-zinc-900">{formatINR(emp.salary || 0)}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Per Day Rate:</span><span className="font-semibold text-zinc-700">₹{perDayRateRupees.toFixed(2)}/day</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Payment Account:</span><span className="font-semibold text-zinc-700">{emp.accountNo ? `A/C ..${emp.accountNo.slice(-4)}` : emp.upiId ? "UPI" : "Cash"}</span></div>
                      </div>
                    </div>

                    {/* Attendance Days Calculation Breakdown */}
                    <div className="bg-white p-5 rounded-xl border border-zinc-200 space-y-4">
                      <h5 className="font-bold text-xs uppercase tracking-wider text-zinc-700 border-b border-zinc-100 pb-2">Monthly Days Breakdown ({attendanceMonth})</h5>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between"><span className="text-zinc-600">Total Calendar Days:</span><span className="font-bold text-zinc-900">{daysInMonth} Days</span></div>
                        <div className="flex justify-between text-emerald-700"><span className="font-medium">Days Present:</span><span className="font-bold">{presentCount} Days</span></div>
                        <div className="flex justify-between text-amber-700"><span className="font-medium">Half Days (0.5x):</span><span className="font-bold">{halfDayCount} ({halfDayCount * 0.5} Days)</span></div>
                        <div className="flex justify-between text-blue-700"><span className="font-medium">Paid Leaves:</span><span className="font-bold">{paidLeaveCount} Days</span></div>
                        <div className="flex justify-between text-zinc-500"><span className="font-medium">Sunday Holidays (Paid):</span><span className="font-bold">{sundayCount} Days</span></div>
                        <div className="flex justify-between text-red-600 font-bold pt-2 border-t border-zinc-100"><span>Unpaid LOP Days:</span><span>{unpaidLopDays} Days</span></div>
                      </div>
                    </div>

                    {/* Net Salary & LOP Statement Card */}
                    <div className="bg-gradient-to-br from-zinc-900 to-black text-white p-5 rounded-xl border border-zinc-800 space-y-4 flex flex-col justify-between">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Net Disbursable Salary Audit</div>
                        <div className="text-3xl font-black text-emerald-400 mt-2">₹{netDisbursableRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                        <div className="text-xs text-zinc-400 mt-1">Calculated after LOP deductions</div>
                      </div>

                      <div className="space-y-2 pt-4 border-t border-zinc-800 text-xs">
                        <div className="flex justify-between text-zinc-400"><span>Base Salary:</span><span>₹{baseSalaryRupees.toFixed(2)}</span></div>
                        <div className="flex justify-between text-red-400"><span>(-) LOP Deduction ({unpaidLopDays} days):</span><span>-₹{lopDeductionRupees.toFixed(2)}</span></div>
                        <div className="flex justify-between font-bold text-white pt-2 border-t border-zinc-800"><span>Net Payable:</span><span className="text-emerald-400">₹{netDisbursableRupees.toFixed(2)}</span></div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </TabsContent>

        {/* Payments & Salary Log Tab */}
        <TabsContent value="payments" className="m-0 space-y-4">
          <div className="flex items-center justify-between bg-white p-4 border border-zinc-200 rounded-xl">
            <div>
              <h4 className="font-bold text-zinc-900 text-sm">Salary &amp; Advance Disbursements</h4>
              <p className="text-xs text-zinc-500">History of salary payouts, advance payments, and deductions.</p>
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 rounded"
              onClick={() => { setPaymentEmpId(undefined); setIsPaymentOpen(true); }}
            >
              <Plus className="h-4 w-4" /> Record Payout
            </Button>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-100">
            {paymentList.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                No payment transactions recorded yet. Click &quot;Record Payout&quot; to log a salary or advance disbursement.
              </div>
            ) : (
              paymentList.map((p) => (
                <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/50">
                  <div>
                    <div className="font-bold text-zinc-900 text-sm flex items-center gap-2">
                      {p.employee?.name || "Employee"}
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold border-zinc-250">
                        {p.type}
                      </Badge>
                      <Badge className="text-[10px] bg-zinc-100 text-zinc-700 border-0 font-medium">
                        {p.paymentMode.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      Date: {p.date} {p.monthPeriod ? `• Period: ${p.monthPeriod}` : ""} {p.referenceNo ? `• Ref: ${p.referenceNo}` : ""}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-base text-zinc-900 tabular-nums">
                      {formatINR(p.amount)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Controlled Edit & Profile Dialogs */}
      <EmployeeDialog
        employee={editingEmployee}
        open={!!editingEmployee}
        onOpenChange={(o) => {
          if (!o) setEditingEmployee(null);
        }}
      />

      <EmployeeProfileModal
        employee={profileEmployee}
        open={!!profileEmployee}
        onOpenChange={(o) => {
          if (!o) setProfileEmployee(null);
        }}
      />

      <PaySlipModal
        employee={payslipEmployee}
        open={!!payslipEmployee}
        onOpenChange={(o) => {
          if (!o) setPayslipEmployee(null);
        }}
      />

      <RecordPaymentDialog
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        employees={employeeList}
        payments={paymentList}
        defaultEmployeeId={paymentEmpId}
      />
    </main>
  );
}
