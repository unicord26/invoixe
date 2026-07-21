"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatINR, rupeesToPaise } from "@invoixe/core";
import { GST_RATES, type Party } from "@invoixe/types";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/page-header";
import { DataTable, type Column } from "../../components/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  CreditCard,
  Zap,
  Search,
  HelpCircle,
  Home,
  Users,
  Car,
  Briefcase,
  Megaphone,
  Wrench,
  Calendar,
  Filter,
} from "lucide-react";

type Row = {
  id: string;
  number: string;
  date: string;
  category: string | null;
  paymentMode: string | null;
  grandTotal: number;
  subTotal: number;
  totalTax: number;
  taxRate?: number;
  notes: string | null;
  party: Party | null;
};

const CATEGORIES = [
  { value: "Rent", label: "Rent", icon: Home, color: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/20" },
  { value: "Salary", label: "Salary", icon: Users, color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/20" },
  { value: "Electricity", label: "Electricity", icon: Zap, color: "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/20" },
  { value: "Transport", label: "Transport", icon: Car, color: "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950/20" },
  { value: "Office", label: "Office Supplies", icon: Briefcase, color: "text-zinc-600 bg-zinc-50 dark:text-zinc-400 dark:bg-zinc-950/20" },
  { value: "Marketing", label: "Marketing", icon: Megaphone, color: "text-pink-600 bg-pink-50 dark:text-pink-400 dark:bg-pink-950/20" },
  { value: "Maintenance", label: "Maintenance", icon: Wrench, color: "text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-950/20" },
  { value: "Misc", label: "Miscellaneous", icon: HelpCircle, color: "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950/20" },
];

const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI / QR Code" },
  { value: "cheque", label: "Bank Cheque" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Debit/Credit Card" },
];

export default function ExpensesPage() {
  const qc = useQueryClient();

  // Queries
  const { data: expenses, isLoading, error } = useQuery<Row[]>({
    queryKey: ["expenses"],
    queryFn: () => api.get<Row[]>("/api/expenses"),
  });

  const { data: parties } = useQuery<Party[]>({
    queryKey: ["parties"],
    queryFn: () => api.get<Party[]>("/api/parties"),
  });

  // Form States
  const [category, setCategory] = useState("Rent");
  const [amount, setAmount] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [partyId, setPartyId] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");

  const suppliers = parties?.filter((p) => p.type === "supplier" || p.type === "both") ?? [];

  // Mutate add
  const add = useMutation({
    mutationFn: () =>
      api.post("/api/expenses", {
        category,
        amount: rupeesToPaise(Number(amount)),
        taxRate: Number(taxRate),
        partyId: partyId || null,
        paymentMode,
        date: date ? new Date(date) : new Date(),
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Operational expense recorded successfully!");
      setAmount("");
      setPartyId("");
      setNotes("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to add expense");
    },
  });

  // Calculate dynamic Tax preview from the input amount (which is treated as inclusive)
  const gstPreview = useMemo(() => {
    const numAmt = Number(amount);
    if (!numAmt || numAmt <= 0) return { subTotal: 0, tax: 0 };
    const rate = Number(taxRate);
    if (rate === 0) return { subTotal: numAmt, tax: 0 };
    // amount = subTotal + (subTotal * rate / 100) => subTotal = amount / (1 + rate/100)
    const subTotal = numAmt / (1 + rate / 100);
    const tax = numAmt - subTotal;
    return { subTotal, tax };
  }, [amount, taxRate]);

  // Calculations for KPI Cards
  const stats = useMemo(() => {
    if (!expenses) return { total: 0, cash: 0, digital: 0, count: 0 };
    let total = 0;
    let cash = 0;
    let digital = 0;
    expenses.forEach((e) => {
      total += e.grandTotal;
      if (e.paymentMode === "cash") {
        cash += e.grandTotal;
      } else {
        digital += e.grandTotal;
      }
    });
    return {
      total,
      cash,
      digital,
      count: expenses.length,
    };
  }, [expenses]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    if (!expenses) return [];
    return expenses.filter((r) => {
      const matchesSearch =
        (r.category?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (r.number?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (r.party?.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (r.notes?.toLowerCase() || "").includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategoryFilter === "All" || r.category === selectedCategoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchQuery, selectedCategoryFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid expense amount");
      return;
    }
    add.mutate();
  };

  const columns: Column<Row>[] = [
    {
      key: "date",
      header: "Date",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          <span className="font-semibold text-zinc-650 dark:text-zinc-400">
            {new Date(r.date).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      ),
    },
    {
      key: "number",
      header: "Expense No",
      cell: (r) => (
        <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-300">
          {r.number}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (r) => {
        const catInfo = CATEGORIES.find((c) => c.value === r.category) || {
          label: r.category || "Expense",
          icon: HelpCircle,
          color: "text-zinc-600 bg-zinc-50 dark:text-zinc-400 dark:bg-zinc-950/20",
        };
        const Icon = catInfo.icon;
        return (
          <div className={cn("inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold", catInfo.color)}>
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{catInfo.label}</span>
          </div>
        );
      },
    },
    {
      key: "party",
      header: "Supplier",
      cell: (r) => (
        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
          {r.party?.name || "—"}
        </span>
      ),
    },
    {
      key: "paymentMode",
      header: "Payment Mode",
      cell: (r) => {
        const mode = PAYMENT_MODES.find((m) => m.value === r.paymentMode)?.label || r.paymentMode || "—";
        return (
          <span className="text-xs font-bold text-zinc-500 capitalize">
            {mode}
          </span>
        );
      },
    },
    {
      key: "notes",
      header: "Notes / Description",
      cell: (r) => (
        <span className="text-zinc-450 dark:text-zinc-500 text-xs truncate max-w-[180px] block">
          {r.notes || "—"}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount Paid",
      align: "right",
      cell: (r) => (
        <div className="text-right">
          <span className="font-black font-mono text-red-600 dark:text-red-400 text-sm">
            {formatINR(r.grandTotal)}
          </span>
          {r.taxRate !== undefined && r.taxRate > 0 && (
            <div className="text-[9px] text-zinc-400 font-bold mt-0.5">
              Incl. GST {r.taxRate}%
            </div>
          )}
        </div>
      ),
    },
  ];

  const inputStyle =
    "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-zinc-800 dark:bg-zinc-950 dark:text-white";

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Business Expenses Portal"
        description="Monitor operations overheads, classify cash logs, and record supplier utility payments."
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
          <CardContent className="p-0 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Total Expenses logged
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-450 dark:bg-zinc-900 dark:text-zinc-550">
                <TrendingUp className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <h2 className="text-xl font-extrabold tracking-tight text-red-650 dark:text-red-400">
                {formatINR(stats.total)}
              </h2>
              <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
                Aggregate spent across {stats.count} bills
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
          <CardContent className="p-0 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Digital Payments
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-450 dark:bg-zinc-900 dark:text-zinc-550">
                <CreditCard className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                {formatINR(stats.digital)}
              </h2>
              <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
                UPI, Transfers &amp; Card settlements
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
          <CardContent className="p-0 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Cash Settlements
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-450 dark:bg-zinc-900 dark:text-zinc-550">
                <Zap className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                {formatINR(stats.cash)}
              </h2>
              <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
                Physical register cash balance impact
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Record Form */}
        <Card className="lg:col-span-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl shadow-sm overflow-hidden">
          <div className="border-b border-zinc-100 dark:border-zinc-850 px-5 py-4 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/10">
            <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
              Record Operational Expense
            </h3>
            <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full dark:bg-primary/20">
              Quick Entry
            </span>
          </div>
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category */}
              <div>
                <label className="mb-1 block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Expense Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputStyle}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="mb-1 block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Total Paid (₹, Tax Inclusive)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className={cn(inputStyle, "pl-8")}
                  />
                </div>
              </div>

              {/* Party Selection */}
              <div>
                <label className="mb-1 block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Supplier / Payee Party
                </label>
                <select
                  value={partyId}
                  onChange={(e) => setPartyId(e.target.value)}
                  className={inputStyle}
                >
                  <option value="">— Select Supplier (Optional) —</option>
                  {suppliers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* GST Rate */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    GST Input Rate
                  </label>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className={inputStyle}
                  >
                    {GST_RATES.map((r) => (
                      <option key={r} value={r}>
                        {r}%
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className={inputStyle}
                  >
                    {PAYMENT_MODES.map((pm) => (
                      <option key={pm.value} value={pm.value}>
                        {pm.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="mb-1 block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputStyle}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Notes &amp; Description
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Rent for July, utility bills reference etc."
                  rows={2}
                  className={cn(inputStyle, "resize-none")}
                />
              </div>

              {/* Computation Tax Preview */}
              {Number(amount) > 0 && (
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/50 p-3.5 space-y-1.5 text-xs border border-zinc-100 dark:border-zinc-800">
                  <div className="flex justify-between font-bold text-zinc-400">
                    <span>Taxable Base Value</span>
                    <span>{formatINR(gstPreview.subTotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-zinc-400">
                    <span>Estimated GST ({taxRate}%)</span>
                    <span>{formatINR(gstPreview.tax)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-zinc-900 dark:text-white border-t border-zinc-200 dark:border-zinc-800 pt-1.5 mt-1.5">
                    <span>Net Amount Spent</span>
                    <span>{formatINR(Number(amount))}</span>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={add.isPending || !(Number(amount) > 0)}
                className="w-full h-11 bg-primary text-primary-foreground font-extrabold rounded-xl shadow-sm transition hover:bg-primary/95"
              >
                {add.isPending ? "Recording log..." : "Record Expense"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Ledger Grid / DataTable */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters Row */}
          <Card className="p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search expenses by category, party, receipt no, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 py-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              {/* Category Filter Switcher */}
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-zinc-400" />
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950 dark:text-white font-semibold"
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* DataTable Card */}
          <DataTable
            columns={columns}
            rows={filteredRows}
            getRowKey={(r) => r.id}
            isLoading={isLoading}
            error={error}
            emptyMessage={
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="h-12 w-12 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 mb-3 border dark:border-zinc-850">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200">
                  No Expense Logs Found
                </h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-[280px]">
                  Use the quick record panel on the left to document operational expenditures.
                </p>
              </div>
            }
            className="border border-zinc-200 dark:border-zinc-850 rounded-2xl shadow-xs overflow-hidden"
          />
        </div>
      </div>
    </main>
  );
}
