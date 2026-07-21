"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  MoreHorizontal,
  Trash2,
  ArrowUpRight,
  Check,
  AlertTriangle,
  Landmark,
  FileCheck,
  Percent,
} from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@invoixe/core";
import type { ChequeStatus, LoanEntryKind } from "@invoixe/types";
import { api } from "../../../lib/api";
import { PageHeader } from "../../../components/page-header";
import { DataTable, type Column } from "../../../components/data-table";
import { MoneyInput } from "../../../components/money-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/* -----------------------------------------
   TYPES & SCHEMAS
----------------------------------------- */
type Cheque = {
  id: string;
  chequeNo: string;
  amount: number;
  direction: "received" | "issued";
  status: ChequeStatus;
  date: string;
  dueDate: string | null;
  notes: string | null;
  partyId: string | null;
  bankAccountId: string | null;
};

type Entry = { id: string; amount: number; kind: LoanEntryKind; date: string; note: string | null };
type Loan = {
  id: string;
  lender: string;
  principal: number;
  balance: number;
  interestRate: number | null;
  startDate: string;
  notes: string | null;
  entries: Entry[];
};

const STATUS_STYLE: Record<ChequeStatus, string> = {
  open: "bg-amber-50 text-amber-700 border border-amber-200",
  deposited: "bg-blue-50 text-blue-700 border border-blue-200",
  cleared: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  bounced: "bg-rose-50 text-rose-700 border border-rose-200",
};

const chequeFormSchema = z.object({
  chequeNo: z.string().trim().min(1, "Cheque no. required"),
  amount: z.number().int().positive().nullable(),
  direction: z.enum(["received", "issued"]),
  dueDate: z.string(),
  notes: z.string(),
  partyId: z.string().optional(),
  bankAccountId: z.string().optional(),
});
type ChequeFormValues = z.infer<typeof chequeFormSchema>;
const CHEQUE_DEFAULTS: ChequeFormValues = {
  chequeNo: "",
  amount: null,
  direction: "received",
  dueDate: "",
  notes: "",
  partyId: "",
  bankAccountId: "",
};

const loanFormSchema = z.object({
  lender: z.string().trim().min(1, "Lender required"),
  principal: z.number().int().nonnegative().nullable(),
  interestRate: z.string(),
  notes: z.string(),
});
type LoanFormValues = z.infer<typeof loanFormSchema>;
const LOAN_DEFAULTS: LoanFormValues = { lender: "", principal: null, interestRate: "", notes: "" };

const entryFormSchema = z.object({
  amount: z.number().int().positive().nullable(),
  kind: z.enum(["disbursement", "emi", "charge"]),
  note: z.string(),
});
type EntryFormValues = z.infer<typeof entryFormSchema>;

/* -----------------------------------------
   DIALOG COMPONENTS
----------------------------------------- */
function AddChequeDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const form = useForm<ChequeFormValues>({ resolver: zodResolver(chequeFormSchema), defaultValues: CHEQUE_DEFAULTS });

  const { data: parties } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["parties"],
    queryFn: () => api.get("/api/parties"),
    enabled: open,
  });

  const { data: bankAccounts } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["bank-accounts"],
    queryFn: () => api.get("/api/bank/accounts"),
    enabled: open,
  });

  const create = useMutation({
    mutationFn: (v: ChequeFormValues) =>
      api.post<Cheque>("/api/cheques", {
        chequeNo: v.chequeNo.trim(),
        amount: v.amount ?? 0,
        direction: v.direction,
        dueDate: v.dueDate || null,
        notes: v.notes.trim() || null,
        partyId: v.partyId && v.partyId !== "none" ? v.partyId : null,
        bankAccountId: v.bankAccountId && v.bankAccountId !== "none" ? v.bankAccountId : null,
      }),
    onSuccess: () => {
      onAdded();
      toast.success("Cheque recorded");
      form.reset(CHEQUE_DEFAULTS);
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add cheque"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) form.reset(CHEQUE_DEFAULTS); }}>
      <DialogTrigger asChild>
        <Button className="gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold h-9">
          <Plus className="h-4 w-4" />
          Add Cheque
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-zinc-950 uppercase tracking-wider">Record Cheque Transaction</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="chequeNo" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-zinc-650">Cheque no.</FormLabel>
                <FormControl><Input placeholder="e.g. 000123" className="text-xs h-9" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="direction" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-zinc-650">Direction</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="text-xs h-9 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-white">
                    <SelectItem value="received" className="text-xs">Received</SelectItem>
                    <SelectItem value="issued" className="text-xs">Issued</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-zinc-650">Amount (₹)</FormLabel>
                <FormControl><MoneyInput value={field.value} onChange={field.onChange} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="dueDate" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-zinc-650">Due date</FormLabel>
                <FormControl><Input type="date" className="text-xs h-9" {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="partyId" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-zinc-650">Party (Customer/Supplier)</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="text-xs h-9 bg-white">
                      <SelectValue placeholder="Select Party (Optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-white">
                    <SelectItem value="none" className="text-xs">No Party (Cash)</SelectItem>
                    {parties?.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={form.control} name="bankAccountId" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-zinc-650">Bank Account</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="text-xs h-9 bg-white">
                      <SelectValue placeholder="Select Account (Optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-white">
                    <SelectItem value="none" className="text-xs">No Account</SelectItem>
                    {bankAccounts?.map((b) => (
                      <SelectItem key={b.id} value={b.id} className="text-xs">
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel className="text-xs font-semibold text-zinc-650">Notes / Remarks</FormLabel>
                <FormControl><Input placeholder="Optional reference notes" className="text-xs h-9" {...field} /></FormControl>
              </FormItem>
            )} />
            <DialogFooter className="sm:col-span-2 pt-2 border-t mt-2">
              <Button type="button" variant="outline" className="text-xs h-9" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="text-xs h-9 bg-zinc-900 text-white hover:bg-zinc-800" disabled={create.isPending}>
                {create.isPending ? "Recording…" : "Record Cheque"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function AddLoanDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const form = useForm<LoanFormValues>({ resolver: zodResolver(loanFormSchema), defaultValues: LOAN_DEFAULTS });

  const create = useMutation({
    mutationFn: (v: LoanFormValues) =>
      api.post<Loan>("/api/loans", {
        lender: v.lender.trim(),
        principal: v.principal ?? 0,
        interestRate: v.interestRate ? Number(v.interestRate) : null,
        notes: v.notes.trim() || null,
      }),
    onSuccess: () => {
      onAdded();
      toast.success("Loan account created");
      form.reset(LOAN_DEFAULTS);
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create loan account"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) form.reset(LOAN_DEFAULTS); }}>
      <DialogTrigger asChild>
        <Button className="gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold h-9">
          <Plus className="h-4 w-4" />
          Add Loan Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-zinc-950 uppercase tracking-wider">Add Loan Account</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="lender" render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel className="text-xs font-semibold text-zinc-650">Lender / Financial Institution</FormLabel>
                <FormControl><Input placeholder="e.g. HDFC Bank, SBI" className="text-xs h-9" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="principal" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-zinc-650">Principal Amount (₹)</FormLabel>
                <FormControl><MoneyInput value={field.value} onChange={field.onChange} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="interestRate" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-zinc-650">Annual Interest Rate (%)</FormLabel>
                <FormControl><Input type="number" step="0.01" min="0" placeholder="e.g. 8.5" className="text-xs h-9" {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel className="text-xs font-semibold text-zinc-650">Remarks / Account Details</FormLabel>
                <FormControl><Input placeholder="Optional reference notes" className="text-xs h-9" {...field} /></FormControl>
              </FormItem>
            )} />
            <DialogFooter className="sm:col-span-2 pt-2 border-t mt-2">
              <Button type="button" variant="outline" className="text-xs h-9" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="text-xs h-9 bg-zinc-900 text-white hover:bg-zinc-800" disabled={create.isPending}>
                {create.isPending ? "Creating…" : "Add Loan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function AddEntryDialog({ loan, onAdded }: { loan: Loan; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: { amount: null, kind: "emi", note: "" },
  });

  const create = useMutation({
    mutationFn: (v: EntryFormValues) =>
      api.post(`/api/loans/${loan.id}/entries`, { amount: v.amount ?? 0, kind: v.kind, note: v.note.trim() || null }),
    onSuccess: () => {
      onAdded();
      toast.success("Credit transaction recorded");
      form.reset({ amount: null, kind: "emi", note: "" });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not record entry"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1 text-[10px] h-7 border-zinc-200 rounded">
          <Plus className="h-3 w-3" />
          Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm bg-white">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-zinc-950 uppercase tracking-wider">Record Transaction — {loan.lender}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="space-y-4">
            <FormField control={form.control} name="kind" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-zinc-650">Transaction Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-white">
                    <SelectItem value="emi" className="text-xs">EMI Repayment (Reduces balance)</SelectItem>
                    <SelectItem value="disbursement" className="text-xs">Disbursement Drawdown (Adds to balance)</SelectItem>
                    <SelectItem value="charge" className="text-xs">Charges / Interest Debit (Adds to balance)</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-zinc-650">Transaction Amount (₹)</FormLabel>
                <FormControl><MoneyInput value={field.value} onChange={field.onChange} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-zinc-650">Note / Reference</FormLabel>
                <FormControl><Input placeholder="Optional description" className="text-xs h-9" {...field} /></FormControl>
              </FormItem>
            )} />
            <DialogFooter className="pt-2 border-t mt-2">
              <Button type="button" variant="outline" className="text-xs h-9" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="text-xs h-9 bg-zinc-900 text-white hover:bg-zinc-800" disabled={create.isPending}>
                {create.isPending ? "Recording…" : "Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/* -----------------------------------------
   MAIN INSTRUMENTS PAGE
----------------------------------------- */
export default function FinancialInstrumentsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"cheques" | "loans">("cheques");
  const [directionFilter, setDirectionFilter] = useState<"all" | "received" | "issued">("all");

  // 1. Cheques query
  const { data: cheques, isLoading: chequesLoading, error: chequesError } = useQuery({
    queryKey: ["cheques"],
    queryFn: () => api.get<Cheque[]>("/api/cheques"),
  });

  // 2. Loans query
  const { data: loans, isLoading: loansLoading, error: loansError } = useQuery({
    queryKey: ["loans"],
    queryFn: () => api.get<Loan[]>("/api/loans"),
  });

  // 3. Parties query
  const { data: parties } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["parties"],
    queryFn: () => api.get("/api/parties"),
  });

  // 4. Bank Accounts query
  const { data: bankAccounts } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["bank-accounts"],
    queryFn: () => api.get("/api/bank/accounts"),
  });

  const setChequeStatus = useMutation({
    mutationFn: (v: { id: string; status: ChequeStatus }) => api.patch(`/api/cheques/${v.id}/status`, { status: v.status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cheques"] });
      toast.success("Cheque status updated");
    },
    onError: () => toast.error("Could not update cheque status"),
  });

  const removeCheque = useMutation({
    mutationFn: (id: string) => api.del(`/api/cheques/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cheques"] });
      toast.success("Cheque record deleted");
    },
  });

  const removeLoan = useMutation({
    mutationFn: (id: string) => api.del(`/api/loans/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] });
      toast.success("Loan account closed and deleted");
    },
  });

  // Summaries Calculations
  const summaries = useMemo(() => {
    const totalPendingCheques = (cheques ?? [])
      .filter((c) => c.status === "open" || c.status === "deposited")
      .reduce((sum, c) => sum + c.amount, 0);

    const receivedCount = (cheques ?? []).filter((c) => c.direction === "received" && (c.status === "open" || c.status === "deposited")).length;
    const issuedCount = (cheques ?? []).filter((c) => c.direction === "issued" && (c.status === "open" || c.status === "deposited")).length;

    const totalLoanBalance = (loans ?? []).reduce((sum, l) => sum + l.balance, 0);
    const totalLoanPrincipal = (loans ?? []).reduce((sum, l) => sum + l.principal, 0);

    return {
      totalPendingCheques,
      receivedCount,
      issuedCount,
      totalLoanBalance,
      totalLoanPrincipal,
    };
  }, [cheques, loans]);

  // Cheques Filtered List
  const filteredCheques = useMemo(() => {
    return (cheques ?? []).filter((c) => {
      if (directionFilter === "all") return true;
      return c.direction === directionFilter;
    });
  }, [cheques, directionFilter]);

  const chequeColumns: Column<Cheque>[] = [
    {
      key: "no",
      header: "Cheque No.",
      cell: (c) => <span className="font-bold text-zinc-900">{c.chequeNo}</span>,
    },
    {
      key: "party",
      header: "Party Link",
      cell: (c) => {
        const p = parties?.find((x) => x.id === c.partyId);
        return <span className="font-semibold text-zinc-750">{p ? p.name : "Cash / No Party"}</span>;
      },
    },
    {
      key: "dir",
      header: "Direction",
      cell: (c) => (
        <Badge
          variant="secondary"
          className={cn(
            "capitalize font-bold text-[9px] px-2 py-0.5 border rounded-md",
            c.direction === "received"
              ? "bg-emerald-50 text-emerald-700 border-emerald-150"
              : "bg-zinc-50 text-zinc-650 border-zinc-200"
          )}
        >
          {c.direction}
        </Badge>
      ),
    },
    {
      key: "bank",
      header: "Bank Account",
      cell: (c) => {
        const b = bankAccounts?.find((x) => x.id === c.bankAccountId);
        return <span className="text-zinc-500 font-medium">{b ? b.name : "—"}</span>;
      },
    },
    {
      key: "due",
      header: "Due Date",
      cell: (c) => (
        <span className="text-zinc-600 font-medium">
          {c.dueDate ? new Date(c.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (c) => (
        <Badge className={cn("capitalize text-[9px] font-bold px-2 py-0.5 rounded-md", STATUS_STYLE[c.status])}>
          {c.status}
        </Badge>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (c) => <span className="font-black font-mono text-zinc-900">{formatINR(c.amount)}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (c) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-700 rounded-lg">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white">
            {c.status !== "deposited" && (
              <DropdownMenuItem onClick={() => setChequeStatus.mutate({ id: c.id, status: "deposited" })} className="text-xs">
                <ArrowUpRight className="mr-2 h-3.5 w-3.5 text-zinc-500" />
                Mark Deposited
              </DropdownMenuItem>
            )}
            {c.status !== "cleared" && (
              <DropdownMenuItem onClick={() => setChequeStatus.mutate({ id: c.id, status: "cleared" })} className="text-xs">
                <Check className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                Mark Cleared
              </DropdownMenuItem>
            )}
            {c.status !== "bounced" && (
              <DropdownMenuItem onClick={() => setChequeStatus.mutate({ id: c.id, status: "bounced" })} className="text-xs">
                <AlertTriangle className="mr-2 h-3.5 w-3.5 text-rose-600" />
                Mark Bounced
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-650 focus:text-red-650 text-xs" onClick={() => removeCheque.mutate(c.id)}>
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete Record
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <main className="mx-auto max-w-[1600px] px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <PageHeader
        title="Cheques & Loan Portals"
        description="Audit banking cheques status and track active borrowed loan credit entries."
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <Card className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
          <CardContent className="p-0 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Uncleared Cheques
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-450 dark:bg-zinc-900 dark:text-zinc-550">
                <FileCheck className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                {formatINR(summaries.totalPendingCheques)}
              </h2>
              <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-zinc-550 dark:text-zinc-400">
                {summaries.receivedCount} received · {summaries.issuedCount} issued outstanding
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
          <CardContent className="p-0 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Active Loan Balance
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-450 dark:bg-zinc-900 dark:text-zinc-550">
                <Landmark className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                {formatINR(summaries.totalLoanBalance)}
              </h2>
              <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-zinc-550 dark:text-zinc-400">
                Original Principal: <span className="font-bold">{formatINR(summaries.totalLoanPrincipal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
          <CardContent className="p-0 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Outstanding Credit Liability
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-450 dark:bg-zinc-900 dark:text-zinc-550">
                <Percent className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                {formatINR(summaries.totalLoanBalance + summaries.totalPendingCheques)}
              </h2>
              <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-zinc-550 dark:text-zinc-400">
                Aggregated active liability exposure
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b border-zinc-200">
        {[
          { id: "cheques", label: "Cheques Register" },
          { id: "loans", label: "Business Loans & EMIs" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as "cheques" | "loans")}
            className={cn(
              "px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-650"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        {activeTab === "cheques" && (
          <Card className="border border-zinc-200 shadow-sm bg-white rounded-xl overflow-hidden">
            <div className="p-5 border-b border-zinc-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Direction Filter */}
              <div className="flex items-center gap-1.5 border border-zinc-200 p-0.5 rounded-lg bg-zinc-50/50 w-fit shrink-0">
                {[
                  { id: "all", label: "All Cheques" },
                  { id: "received", label: "Received" },
                  { id: "issued", label: "Issued" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setDirectionFilter(f.id as "all" | "received" | "issued")}
                    className={cn(
                      "px-3 py-1 rounded text-[10px] font-bold transition-colors",
                      directionFilter === f.id
                        ? "bg-white text-zinc-800 shadow-xs border border-zinc-200/60"
                        : "text-zinc-400 hover:text-zinc-650"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <AddChequeDialog onAdded={() => qc.invalidateQueries({ queryKey: ["cheques"] })} />
            </div>

            <div className="overflow-x-auto">
              <DataTable
                columns={chequeColumns}
                rows={filteredCheques}
                getRowKey={(c) => c.id}
                isLoading={chequesLoading}
                error={chequesError}
                emptyMessage="No cheques recorded for this view."
              />
            </div>
          </Card>
        )}

        {activeTab === "loans" && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <AddLoanDialog onAdded={() => qc.invalidateQueries({ queryKey: ["loans"] })} />
            </div>

            {loansLoading && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="h-44 animate-pulse bg-zinc-50 border" />
                <Card className="h-44 animate-pulse bg-zinc-50 border" />
              </div>
            )}
            {loansError && <p className="text-xs font-bold text-rose-650">Failed to load loan accounts.</p>}

            {loans && loans.length === 0 && (
              <Card className="border border-dashed border-zinc-200 bg-white rounded-xl">
                <CardContent className="p-10 text-center text-xs text-zinc-400 flex flex-col items-center gap-2">
                  <Landmark className="h-8 w-8 text-zinc-300" />
                  <p>No active loan accounts found. Add your first lender profile above.</p>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              {loans?.map((loan) => {
                const paidAmt = loan.principal - loan.balance;
                const repaymentPercentage = loan.principal > 0
                  ? Math.max(0, Math.min(100, Math.round((paidAmt / loan.principal) * 100)))
                  : 0;

                return (
                  <Card key={loan.id} className="border border-zinc-200 shadow-sm bg-white rounded-xl">
                    <CardContent className="p-5 space-y-4">
                      {/* Top Header Row */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="font-bold text-zinc-800 text-sm">{loan.lender}</h3>
                          <p className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                            <span>Principal: <span className="font-semibold text-zinc-650">{formatINR(loan.principal)}</span></span>
                            {loan.interestRate != null && (
                              <>
                                <span className="h-1 w-1 rounded-full bg-zinc-300" />
                                <span>Rate: <span className="font-semibold text-zinc-650">{loan.interestRate}% p.a.</span></span>
                              </>
                            )}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-300 hover:text-red-600 rounded-lg shrink-0"
                          onClick={() => removeLoan.mutate(loan.id)}
                          aria-label="Delete loan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Repayment Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[8px] font-bold uppercase tracking-wider text-zinc-400">
                          <span>Principal Repaid</span>
                          <span>{repaymentPercentage}% Paid</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="bg-green-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${repaymentPercentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Outstanding Balance Info */}
                      <div className="p-3 bg-zinc-50 border border-zinc-150 rounded-lg flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Remaining Balance</span>
                          <span className="text-lg font-black text-zinc-900 font-mono">{formatINR(loan.balance)}</span>
                        </div>
                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[9px] px-2 py-0.5 rounded-sm uppercase tracking-wider">
                          Outstanding
                        </Badge>
                      </div>

                      {/* Sub-Ledger Entries Header */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Transaction History</span>
                        <AddEntryDialog loan={loan} onAdded={() => qc.invalidateQueries({ queryKey: ["loans"] })} />
                      </div>

                      {/* Sub-Ledger list */}
                      <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {loan.entries.length === 0 ? (
                          <li className="text-[10px] text-zinc-400 italic">No payments or disbursements logged yet.</li>
                        ) : (
                          loan.entries.slice(0, 5).map((e) => (
                            <li key={e.id} className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-100 last:border-0">
                              <div className="space-y-0.5">
                                <span className={cn(
                                  "capitalize font-bold text-[10px]",
                                  e.kind === "emi" ? "text-emerald-700" : "text-zinc-700"
                                )}>
                                  {e.kind === "emi" ? "EMI Repayment" : e.kind === "disbursement" ? "Disbursement Drawdown" : "Account Charge"}
                                </span>
                                {e.note && (
                                  <span className="text-[9px] text-zinc-400 block font-normal leading-none mt-0.5">
                                    Ref: {e.note}
                                  </span>
                                )}
                              </div>
                              <span className={cn(
                                "font-bold font-mono text-xs tabular-nums",
                                e.kind === "emi" ? "text-emerald-600" : "text-zinc-700"
                              )}>
                                {e.kind === "emi" ? "−" : "+"} {formatINR(e.amount)}
                              </span>
                            </li>
                          ))
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
