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
  Info,
  Loader2,
  Search,
  ArrowLeft,
  Users,
  UserMinus,
  UserCheck,
  DollarSign,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { formatINR, rupeesToPaise, paiseToRupees } from "@invoixe/core";
import type { Employee } from "@invoixe/types";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/page-header";
import { DataTable, type Column } from "../../components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().optional().nullable(),
  email: z.string().email().or(z.literal("")).optional().nullable(),
  role: z.string().trim().optional().nullable(),
  salary: z.coerce.number().nonnegative("Salary must be positive").optional().nullable(),
  status: z.enum(["active", "inactive"]),
  joiningDate: z.string().optional().nullable(),
  leavingDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});
type FormValues = z.infer<typeof formSchema>;

const DEFAULTS: FormValues = {
  name: "",
  phone: "",
  email: "",
  role: "",
  salary: null,
  status: "active",
  joiningDate: "",
  leavingDate: "",
  notes: "",
  address: "",
};

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
          name: employee.name,
          phone: employee.phone || "",
          email: employee.email || "",
          role: employee.role || "",
          salary: employee.salary ? paiseToRupees(employee.salary) : null,
          status: employee.status as "active" | "inactive",
          joiningDate: employee.joiningDate || "",
          leavingDate: employee.leavingDate || "",
          notes: employee.notes || "",
          address: employee.address || "",
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
        name: v.name.trim(),
        phone: v.phone || null,
        email: v.email || null,
        role: v.role || null,
        salary: v.salary ? rupeesToPaise(v.salary) : null,
        status: v.status,
        joiningDate: v.joiningDate || null,
        leavingDate: v.status === "inactive" ? (v.leavingDate || null) : null,
        notes: v.notes || null,
        address: v.address || null,
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

      <DialogContent className="w-[calc(100vw-2rem)] max-w-[700px] p-0 gap-0 overflow-hidden rounded-xl max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-zinc-100 shrink-0">
          <DialogTitle className="text-xl font-semibold text-zinc-900">
            {isEdit ? "Edit Employee Details" : "Add New Employee"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => submitForm(v, false))} className="flex flex-col overflow-hidden">
            <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white overflow-y-auto">
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
                name="role"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-semibold text-zinc-500 uppercase">Designation / Role</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Sales Manager" value={field.value ?? ""} onChange={field.onChange} className="h-10 text-sm" />
                    </FormControl>
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
                name="salary"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-semibold text-zinc-500 uppercase">Monthly Salary (INR)</FormLabel>
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
                name="status"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-semibold text-zinc-500 uppercase">Status</FormLabel>
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
                name="address"
                render={({ field }) => (
                  <FormItem className="col-span-2 space-y-1">
                    <FormLabel className="text-xs font-semibold text-zinc-500 uppercase">Residential Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Employee residence address" value={field.value ?? ""} onChange={field.onChange} className="h-10 text-sm" />
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
                    <FormLabel className="text-xs font-semibold text-zinc-500 uppercase">Internal Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Internal comments or reference details"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        className="resize-none text-sm placeholder:text-zinc-400 h-16"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

export default function EmployeesPage() {
  const qc = useQueryClient();
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<"active" | "inactive">("active");

  const { data: employees, isLoading, error } = useQuery({
    queryKey: ["employees"],
    queryFn: () => api.get<Employee[]>("/api/employees"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/api/employees/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee profile deleted");
    },
    onError: () => toast.error("Could not delete employee"),
  });

  const employeeList = employees ?? [];

  // Stats calculation
  const totalEmployees = employeeList.length;
  const activeStaff = employeeList.filter((e) => e.status === "active").length;
  const pastEmployees = employeeList.filter((e) => e.status === "inactive").length;

  const monthlyPayroll = employeeList
    .filter((e) => e.status === "active" && e.salary)
    .reduce((sum, e) => sum + (e.salary ?? 0), 0);

  // Client filtering
  const filteredRows = employeeList.filter((e) => {
    // Status check
    if (e.status !== selectedTab) return false;

    // Search query check
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = e.name.toLowerCase().includes(q);
      const roleMatch = e.role?.toLowerCase().includes(q) ?? false;
      const phoneMatch = e.phone?.toLowerCase().includes(q) ?? false;
      return nameMatch || roleMatch || phoneMatch;
    }

    return true;
  });

  const columns: Column<Employee>[] = [
    {
      key: "name",
      header: "Employee",
      cell: (e) => (
        <div className="min-w-0">
          <div className="font-semibold text-zinc-900">{e.name}</div>
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
      ),
    },
    {
      key: "role",
      header: "Designation",
      cell: (e) => (
        <span className="text-xs font-semibold text-zinc-700 bg-zinc-50 border border-zinc-150 px-2 py-0.5 rounded">
          {e.role || "—"}
        </span>
      ),
    },
    {
      key: "joiningDate",
      header: selectedTab === "active" ? "Joining Date" : "Relieving Date",
      cell: (e) => (
        <span className="text-xs text-zinc-500">
          {selectedTab === "active" ? (e.joiningDate || "—") : (e.leavingDate || e.joiningDate || "—")}
        </span>
      ),
    },
    {
      key: "salary",
      header: "Salary",
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
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditingEmployee(e)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit profile
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
        title="Employee Directory"
        description="Record staff details, salary payrolls, joining profiles, and relieving logs."
        backHref="/"
        backLabel="Dashboard"
      >
        <EmployeeDialog
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          trigger={
            <Button className="gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded">
              <Plus className="h-4 w-4" />
              Add Employee
            </Button>
          }
        />
      </PageHeader>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-6">
        <Card className="border border-zinc-200/80 shadow-xs rounded-xl bg-white p-5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Headcount</div>
            <div className="text-xl font-bold text-zinc-900 mt-1">{totalEmployees}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Active &amp; past staff</div>
          </div>
          <div className="h-10 w-10 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-450 shrink-0">
            <Users className="h-5 w-5" />
          </div>
        </Card>

        <Card className="border border-zinc-200/80 shadow-xs rounded-xl bg-white p-5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Active Staff</div>
            <div className="text-xl font-bold text-zinc-905 mt-1">{activeStaff}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Currently working</div>
          </div>
          <div className="h-10 w-10 rounded-full bg-green-50 border border-green-100/50 flex items-center justify-center text-green-650 shrink-0">
            <UserCheck className="h-5 w-5" />
          </div>
        </Card>

        <Card className="border border-zinc-200/80 shadow-xs rounded-xl bg-white p-5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Monthly Payroll</div>
            <div className="text-xl font-bold text-zinc-905 mt-1">{formatINR(monthlyPayroll)}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Active staff salaries</div>
          </div>
          <div className="h-10 w-10 rounded-full bg-emerald-50 border border-emerald-100/50 flex items-center justify-center text-emerald-600 shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
        </Card>

        <Card className="border border-zinc-200/80 shadow-xs rounded-xl bg-white p-5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Relieved Employees</div>
            <div className="text-xl font-bold text-zinc-905 mt-1">{pastEmployees}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Past staff records</div>
          </div>
          <div className="h-10 w-10 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 shrink-0">
            <UserMinus className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 mt-6">
        {/* Toggle tabs */}
        <div className="flex border border-zinc-200 rounded-lg p-0.5 bg-zinc-50/50 shrink-0 self-start">
          <button
            onClick={() => setSelectedTab("active")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
              selectedTab === "active"
                ? "bg-white text-zinc-900 shadow-xs border border-zinc-200/50"
                : "text-zinc-500 hover:text-zinc-900"
            )}
          >
            Active Staff
          </button>
          <button
            onClick={() => setSelectedTab("inactive")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
              selectedTab === "inactive"
                ? "bg-white text-zinc-900 shadow-xs border border-zinc-200/50"
                : "text-zinc-500 hover:text-zinc-900"
            )}
          >
            Past Employees
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search by name, designation, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 h-9 text-xs border-zinc-200 rounded-lg placeholder-zinc-400 focus-visible:ring-zinc-200"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={filteredRows}
        getRowKey={(e) => e.id}
        isLoading={isLoading}
        error={error}
        emptyMessage={`No ${selectedTab} employees found. Add one to get started.`}
      />

      {/* Controlled edit dialog */}
      <EmployeeDialog
        employee={editingEmployee}
        open={!!editingEmployee}
        onOpenChange={(o) => {
          if (!o) setEditingEmployee(null);
        }}
      />
    </main>
  );
}
