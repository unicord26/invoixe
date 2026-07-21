"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  Package,
  Printer,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Users,
  Building2,
  Download,
} from "lucide-react";
import { formatINR } from "@invoixe/core";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/page-header";
import { DataExportModal } from "../../components/data-export-modal";
import { ReportPrintModal, type ReportPrintData } from "../../components/report-print-modal";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────
type Gst = {
  output: { taxable: number; cgst: number; sgst: number; igst: number; total: number };
  input: { cgst: number; sgst: number; igst: number; total: number };
  netPayable: number;
};

type Outstanding = {
  id: string;
  name: string;
  type: string;
  phone?: string | null;
  balance: number; // paise
};

type StockRow = {
  id: string;
  name: string;
  itemCode?: string | null;
  categoryName?: string;
  unit: string;
  qty: number;
  minStock: number;
  purchasePrice: number; // paise
  salePrice: number;     // paise
  value: number;         // paise
  low: boolean;
};

type Stock = { rows: StockRow[]; totalValue: number };

const RANGES = [
  { label: "Today", value: "1D" },
  { label: "7 Days", value: "7D" },
  { label: "This Month", value: "1M" },
  { label: "This Year", value: "1Y" },
  { label: "5 Years", value: "5Y" },
  { label: "All Time", value: "All" },
];

// ── Receivables / Payables Distribution Chart ────────────────────────────────
function DebtDistributionChart({
  items,
  title,
  subtitle,
  valueColor,
}: {
  items: Outstanding[];
  title: string;
  subtitle: string;
  valueColor: "green" | "red";
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const brackets = useMemo(() => {
    const list = items.map((i) => ({ ...i, absBal: Math.abs(i.balance) }));

    const b1 = list.filter((i) => i.absBal <= 1000000); // <= ₹10,000
    const b2 = list.filter((i) => i.absBal > 1000000 && i.absBal <= 5000000); // ₹10k - ₹50k
    const b3 = list.filter((i) => i.absBal > 5000000 && i.absBal <= 10000000); // ₹50k - ₹1L
    const b4 = list.filter((i) => i.absBal > 10000000); // > ₹1L

    const sum = (arr: typeof list) => arr.reduce((s, x) => s + x.absBal, 0);

    return [
      { label: "< ₹10k", count: b1.length, total: sum(b1) },
      { label: "₹10k - ₹50k", count: b2.length, total: sum(b2) },
      { label: "₹50k - ₹1 Lakh", count: b3.length, total: sum(b3) },
      { label: "> ₹1 Lakh", count: b4.length, total: sum(b4) },
    ];
  }, [items]);

  const maxTotal = useMemo(() => Math.max(...brackets.map((b) => b.total), 1), [brackets]);
  const activeBracket = hoveredIdx !== null ? brackets[hoveredIdx] : null;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            {title}
          </p>
          <p className="text-[10px] text-zinc-400">{subtitle}</p>
        </div>
        {activeBracket && (
          <div className="px-2.5 py-1 rounded text-xs font-semibold bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            {activeBracket.label}: <strong>{activeBracket.count} accounts</strong> ({formatINR(activeBracket.total)})
          </div>
        )}
      </div>

      <div className="space-y-2 pt-1">
        {brackets.map((b, i) => {
          const pct = (b.total / maxTotal) * 100;
          return (
            <div
              key={i}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="space-y-1 group cursor-pointer"
            >
              <div className="flex justify-between text-[11px]">
                <span className="font-medium text-zinc-600 dark:text-zinc-400">{b.label}</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {b.count} parties ({formatINR(b.total)})
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    valueColor === "green"
                      ? "bg-emerald-500 group-hover:bg-emerald-400"
                      : "bg-rose-500 group-hover:bg-rose-400"
                  )}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── GST Comparison Chart ──────────────────────────────────────────────────────
function GstTaxComparisonChart({ gst }: { gst: Gst }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const rows = [
    { label: "CGST (Central)", output: gst.output.cgst, input: gst.input.cgst },
    { label: "SGST (State)", output: gst.output.sgst, input: gst.input.sgst },
    { label: "IGST (Integrated)", output: gst.output.igst, input: gst.input.igst },
  ];

  const maxVal = Math.max(
    ...rows.map((r) => Math.max(r.output, r.input)),
    1
  );

  const activeRow = hoveredIdx !== null ? rows[hoveredIdx] : null;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            GST Output vs Input Credit Breakdown
          </p>
          <p className="text-[10px] text-zinc-400">
            Comparative analysis of tax collected on sales vs ITC claimed on purchases
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-semibold">
          <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
            <span className="h-2.5 w-2.5 rounded-sm bg-blue-500 inline-block" /> Output Tax
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 inline-block" /> Input Credit
          </span>
        </div>
      </div>

      {activeRow && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
          <span className="font-bold text-zinc-800 dark:text-zinc-100">{activeRow.label}</span>
          <div className="flex items-center gap-4 text-[11px]">
            <span>
              Output: <strong className="text-blue-600">{formatINR(activeRow.output)}</strong>
            </span>
            <span>
              ITC: <strong className="text-emerald-600">{formatINR(activeRow.input)}</strong>
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3 pt-1">
        {rows.map((r, i) => {
          const outPct = (r.output / maxVal) * 100;
          const inpPct = (r.input / maxVal) * 100;

          return (
            <div
              key={i}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="space-y-1 group cursor-pointer"
            >
              <div className="flex justify-between text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                <span>{r.label}</span>
                <span>
                  Output: {formatINR(r.output)} | ITC: {formatINR(r.input)}
                </span>
              </div>
              <div className="space-y-1">
                <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 group-hover:bg-blue-400 transition-all"
                    style={{ width: `${Math.max(outPct, 2)}%` }}
                  />
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 group-hover:bg-emerald-400 transition-all"
                    style={{ width: `${Math.max(inpPct, 2)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Stock Valuation Category Chart ───────────────────────────────────────────
function StockValuationCategoryChart({ rows }: { rows: StockRow[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const categories = useMemo(() => {
    const map: Record<string, { count: number; value: number; qty: number }> = {};
    for (const r of rows) {
      const cat = r.categoryName || "General";
      if (!map[cat]) map[cat] = { count: 0, value: 0, qty: 0 };
      map[cat].count += 1;
      map[cat].value += r.value;
      map[cat].qty += r.qty;
    }
    return Object.entries(map).map(([name, data]) => ({ name, ...data }));
  }, [rows]);

  const maxVal = useMemo(() => Math.max(...categories.map((c) => c.value), 1), [categories]);
  const activeCat = hoveredIdx !== null ? categories[hoveredIdx] : null;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Inventory Valuation by Category
          </p>
          <p className="text-[10px] text-zinc-400">
            Category-wise total product asset distribution
          </p>
        </div>
        {activeCat && (
          <div className="px-2.5 py-1 rounded text-xs font-semibold bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            {activeCat.name}: <strong>{activeCat.count} items</strong> ({formatINR(activeCat.value)})
          </div>
        )}
      </div>

      <div className="space-y-2 pt-1">
        {categories.map((c, i) => {
          const pct = (c.value / maxVal) * 100;
          return (
            <div
              key={i}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="space-y-1 group cursor-pointer"
            >
              <div className="flex justify-between text-[11px]">
                <span className="font-medium text-zinc-600 dark:text-zinc-400">{c.name} ({c.count} items)</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {formatINR(c.value)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-500 group-hover:bg-purple-400 transition-all"
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main BNT Reports Component ──────────────────────────────────────────────
export function BntReports() {
  const [range, setRange] = useState("1M");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    receivables: true,
    payables: true,
    gst: true,
    stock: true,
  });

  // Data Export Modal state
  const [exportModal, setExportModal] = useState<{
    open: boolean;
    title: string;
    filenamePrefix: string;
    rows: string[][];
  }>({ open: false, title: "", filenamePrefix: "", rows: [] });

  // PDF Print Modal state
  const [printModalData, setPrintModalData] = useState<ReportPrintData | null>(null);

  // Queries
  const { data: gst, refetch: refetchGst } = useQuery({
    queryKey: ["reports", "gst", range],
    queryFn: () => api.get<Gst>(`/api/reports/gst?range=${range}`),
  });

  const { data: receivables = [], refetch: refetchRec } = useQuery({
    queryKey: ["reports", "receivables"],
    queryFn: () => api.get<Outstanding[]>("/api/reports/outstanding/receivables"),
  });

  const { data: payables = [], refetch: refetchPay } = useQuery({
    queryKey: ["reports", "payables"],
    queryFn: () => api.get<Outstanding[]>("/api/reports/outstanding/payables"),
  });

  const { data: stockData, refetch: refetchStock } = useQuery({
    queryKey: ["reports", "stock"],
    queryFn: () => api.get<Stock>("/api/reports/stock"),
  });

  const toggleSection = (sec: string) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const totalReceivables = useMemo(() => receivables.reduce((s, r) => s + r.balance, 0), [receivables]);
  const totalPayables = useMemo(() => payables.reduce((s, p) => s + p.balance, 0), [payables]);
  const stockRows = useMemo(() => stockData?.rows ?? [], [stockData?.rows]);
  const totalStockVal = stockData?.totalValue ?? 0;
  const lowStockRows = useMemo(() => stockRows.filter((r) => r.low), [stockRows]);

  // Search filter states
  const [recSearch, setRecSearch] = useState("");
  const [paySearch, setPaySearch] = useState("");
  const [stockSearch, setStockSearch] = useState("");

  const filteredReceivables = useMemo(() => {
    if (!recSearch.trim()) return receivables;
    const q = recSearch.toLowerCase();
    return receivables.filter((r) => r.name.toLowerCase().includes(q) || (r.phone && r.phone.includes(q)));
  }, [receivables, recSearch]);

  const filteredPayables = useMemo(() => {
    if (!paySearch.trim()) return payables;
    const q = paySearch.toLowerCase();
    return payables.filter((p) => p.name.toLowerCase().includes(q) || (p.phone && p.phone.includes(q)));
  }, [payables, paySearch]);

  const filteredStock = useMemo(() => {
    if (!stockSearch.trim()) return stockRows;
    const q = stockSearch.toLowerCase();
    return stockRows.filter((s) => s.name.toLowerCase().includes(q) || (s.itemCode && s.itemCode.toLowerCase().includes(q)));
  }, [stockRows, stockSearch]);

  const handleRefresh = () => {
    refetchGst();
    refetchRec();
    refetchPay();
    refetchStock();
  };

  const triggerExportModal = (title: string, filenamePrefix: string, rows: string[][]) => {
    setExportModal({ open: true, title, filenamePrefix, rows });
  };

  const handleOpenPdfReport = () => {
    setPrintModalData({
      reportType: "bnt",
      title: "Balance & Taxes Financial Audit Report",
      periodLabel: RANGES.find((r) => r.value === range)?.label ?? range,
      summary: {
        totalReceivables,
        totalPayables,
        netGstPayable: gst?.netPayable ?? 0,
        totalStockVal,
      },
      tables: {
        receivables,
        payables,
      },
    });
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <PageHeader
        title="Balance & Taxes Reports"
        description="Comprehensive audit of customer receivables, supplier payables, GST return computation, and inventory valuation."
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Selector */}
          <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1 shadow-inner dark:border-zinc-800 dark:bg-zinc-900">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-bold transition-all",
                  range === r.value
                    ? "bg-white text-zinc-900 shadow-xs border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>

          <button
            onClick={handleOpenPdfReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-500 transition shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Reports
          </button>
        </div>
      </PageHeader>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receivables */}
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-zinc-900 dark:border-emerald-900/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Total Receivables</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-zinc-900 dark:text-white mt-2 font-mono">
            {formatINR(totalReceivables)}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-2">
            {receivables.length} Debtors with pending dues
          </p>
        </div>

        {/* Payables */}
        <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/50 to-white dark:from-rose-950/20 dark:to-zinc-900 dark:border-rose-900/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Total Payables</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-zinc-900 dark:text-white mt-2 font-mono">
            {formatINR(totalPayables)}
          </p>
          <p className="text-[11px] text-rose-600 font-semibold mt-2">
            {payables.length} Creditors with pending balance
          </p>
        </div>

        {/* Net GST Liability */}
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-zinc-900 dark:border-blue-900/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Net GST Tax Payable</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-zinc-900 dark:text-white mt-2 font-mono">
            {formatINR(gst?.netPayable ?? 0)}
          </p>
          <p className="text-[11px] text-blue-600 font-semibold mt-2">
            Output: {formatINR(gst?.output.total ?? 0)} | ITC: {formatINR(gst?.input.total ?? 0)}
          </p>
        </div>

        {/* Stock Valuation */}
        <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-zinc-900 dark:border-purple-900/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Stock Inventory Value</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-zinc-900 dark:text-white mt-2 font-mono">
            {formatINR(totalStockVal)}
          </p>
          <p className="text-[11px] text-purple-600 font-semibold mt-2">
            {stockRows.length} Items ({lowStockRows.length} low stock)
          </p>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          Category 1: Receivables (Customer Debtors)
          ──────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden shadow-xs">
        <button
          onClick={() => toggleSection("receivables")}
          className="w-full px-6 py-4 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 transition hover:bg-zinc-100/60"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Users className="w-4 h-4" />
            </div>
            <div className="text-left">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">1. Receivables (Customer Debtors)</h2>
              <p className="text-xs text-zinc-500">Customer dues, debt aging distribution, and party ledgers</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-extrabold text-emerald-600 font-mono">{formatINR(totalReceivables)}</span>
            {openSections.receivables ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
          </div>
        </button>

        {openSections.receivables && (
          <div className="p-6 space-y-6 animate-in fade-in duration-150">
            <DebtDistributionChart items={receivables} title="Receivables Debt Distribution" subtitle="Debt aging breakdown by balance size" valueColor="green" />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search debtor name or phone..."
                  value={recSearch}
                  onChange={(e) => setRecSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-emerald-500 transition"
                />
              </div>

              <button
                onClick={() =>
                  triggerExportModal(
                    "Export Customer Debtors Report",
                    `Receivables_Debtors_Report`,
                    [
                      ["Customer Name", "Phone", "Pending Balance (INR)"],
                      ...filteredReceivables.map((r) => [r.name, r.phone || "-", formatINR(r.balance)]),
                    ]
                  )
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                Export Debtors Data
              </button>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Debtor Name</th>
                    <th className="py-3 px-4">Contact Phone</th>
                    <th className="py-3 px-4 text-right">Outstanding Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                  {filteredReceivables.map((r) => (
                    <tr key={r.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition">
                      <td className="py-2.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">{r.name}</td>
                      <td className="py-2.5 px-4 text-zinc-500">{r.phone || "—"}</td>
                      <td className="py-2.5 px-4 text-right font-bold font-mono text-emerald-600">{formatINR(r.balance)}</td>
                    </tr>
                  ))}
                  {filteredReceivables.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-xs text-zinc-400">No customer receivables found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          Category 2: Payables (Supplier Creditors)
          ──────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden shadow-xs">
        <button
          onClick={() => toggleSection("payables")}
          className="w-full px-6 py-4 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 transition hover:bg-zinc-100/60"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="text-left">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">2. Payables (Supplier Creditors)</h2>
              <p className="text-xs text-zinc-500">Vendor dues, supplier balances, and procurement liabilities</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-extrabold text-rose-600 font-mono">{formatINR(totalPayables)}</span>
            {openSections.payables ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
          </div>
        </button>

        {openSections.payables && (
          <div className="p-6 space-y-6 animate-in fade-in duration-150">
            <DebtDistributionChart items={payables} title="Payables Dues Distribution" subtitle="Supplier dues breakdown by balance size" valueColor="red" />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search supplier name or phone..."
                  value={paySearch}
                  onChange={(e) => setPaySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-rose-500 transition"
                />
              </div>

              <button
                onClick={() =>
                  triggerExportModal(
                    "Export Supplier Creditors Report",
                    `Payables_Creditors_Report`,
                    [
                      ["Supplier Name", "Phone", "Pending Dues (INR)"],
                      ...filteredPayables.map((p) => [p.name, p.phone || "-", formatINR(p.balance)]),
                    ]
                  )
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition"
              >
                <Download className="w-3.5 h-3.5 text-rose-600" />
                Export Creditors Data
              </button>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Supplier Name</th>
                    <th className="py-3 px-4">Contact Phone</th>
                    <th className="py-3 px-4 text-right">Pending Dues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                  {filteredPayables.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition">
                      <td className="py-2.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">{p.name}</td>
                      <td className="py-2.5 px-4 text-zinc-500">{p.phone || "—"}</td>
                      <td className="py-2.5 px-4 text-right font-bold font-mono text-rose-600">{formatINR(p.balance)}</td>
                    </tr>
                  ))}
                  {filteredPayables.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-xs text-zinc-400">No supplier payables found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          Category 3: GST Computation & Filing Report
          ──────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden shadow-xs">
        <button
          onClick={() => toggleSection("gst")}
          className="w-full px-6 py-4 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 transition hover:bg-zinc-100/60"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-left">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">3. GST Computation & Filing Report</h2>
              <p className="text-xs text-zinc-500">GSTR-1 output tax, GSTR-3B input credit (ITC), and net GST liability</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-extrabold text-blue-600 font-mono">{formatINR(gst?.netPayable ?? 0)}</span>
            {openSections.gst ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
          </div>
        </button>

        {openSections.gst && (
          <div className="p-6 space-y-6 animate-in fade-in duration-150">
            {gst && <GstTaxComparisonChart gst={gst} />}

            {/* GST Summary Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Output Tax */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-3">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">GSTR-1 Output Tax Collected</span>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-500">Total Taxable Turnover:</span>
                    <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{formatINR(gst?.output.taxable ?? 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-500">CGST (Central Tax):</span>
                    <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{formatINR(gst?.output.cgst ?? 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-500">SGST (State Tax):</span>
                    <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{formatINR(gst?.output.sgst ?? 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-500">IGST (Integrated Tax):</span>
                    <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{formatINR(gst?.output.igst ?? 0)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 font-bold text-blue-600">
                    <span>Total Output Liability:</span>
                    <span className="font-mono text-sm">{formatINR(gst?.output.total ?? 0)}</span>
                  </div>
                </div>
              </div>

              {/* Input Tax Credit */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-3">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">GSTR-3B Input Tax Credit (ITC)</span>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-500">Eligible CGST ITC:</span>
                    <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{formatINR(gst?.input.cgst ?? 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-500">Eligible SGST ITC:</span>
                    <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{formatINR(gst?.input.sgst ?? 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-500">Eligible IGST ITC:</span>
                    <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{formatINR(gst?.input.igst ?? 0)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 font-bold text-emerald-600">
                    <span>Total Eligible ITC:</span>
                    <span className="font-mono text-sm">{formatINR(gst?.input.total ?? 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          Category 4: Inventory Valuation & Stock Report
          ──────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden shadow-xs">
        <button
          onClick={() => toggleSection("stock")}
          className="w-full px-6 py-4 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 transition hover:bg-zinc-100/60"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
              <Package className="w-4 h-4" />
            </div>
            <div className="text-left">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">4. Inventory Valuation & Stock Report</h2>
              <p className="text-xs text-zinc-500">Product asset valuation, category distribution, and stock re-order levels</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-extrabold text-purple-600 font-mono">{formatINR(totalStockVal)}</span>
            {openSections.stock ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
          </div>
        </button>

        {openSections.stock && (
          <div className="p-6 space-y-6 animate-in fade-in duration-150">
            <StockValuationCategoryChart rows={stockRows} />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search item or SKU..."
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-purple-500 transition"
                />
              </div>

              <button
                onClick={() =>
                  triggerExportModal(
                    "Export Stock Inventory Report",
                    `Inventory_Valuation_Report`,
                    [
                      ["Item Name", "Item Code", "Category", "Quantity", "Purchase Price (INR)", "Stock Value (INR)"],
                      ...filteredStock.map((s) => [s.name, s.itemCode || "-", s.categoryName || "General", `${s.qty} ${s.unit}`, formatINR(s.purchasePrice), formatINR(s.value)]),
                    ]
                  )
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition"
              >
                <Download className="w-3.5 h-3.5 text-purple-600" />
                Export Inventory Data
              </button>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-4">Item Code</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Available Stock</th>
                    <th className="py-3 px-4 text-right">Stock Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                  {filteredStock.slice(0, 15).map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition">
                      <td className="py-2.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">{s.name}</td>
                      <td className="py-2.5 px-4 font-mono text-zinc-500">{s.itemCode || "—"}</td>
                      <td className="py-2.5 px-4">{s.categoryName || "General"}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold", s.low ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300")}>
                          {s.qty} {s.unit}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold font-mono text-purple-600">{formatINR(s.value)}</td>
                    </tr>
                  ))}
                  {filteredStock.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-xs text-zinc-400">No stock inventory items found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Multi-Format Data Export Modal */}
      <DataExportModal
        open={exportModal.open}
        onOpenChange={(op) => setExportModal((prev) => ({ ...prev, open: op }))}
        title={exportModal.title}
        filenamePrefix={exportModal.filenamePrefix}
        rows={exportModal.rows}
      />

      {/* Statutory Corporate Audit PDF Report Modal */}
      <ReportPrintModal
        open={!!printModalData}
        onOpenChange={(op) => {
          if (!op) setPrintModalData(null);
        }}
        data={printModalData}
      />
    </div>
  );
}

export default BntReports;
