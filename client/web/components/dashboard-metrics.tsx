"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IndianRupee,
  Users,
  Package,
  Wallet,
  CheckCircle2,
  Percent,
  Activity,
  FileText,
  ShoppingCart,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Search,
  type LucideIcon
} from "lucide-react";
import { formatINR } from "@invoixe/core";
import { api } from "../lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// --- Typings ---
type DashboardData = {
  todaySales: number;
  partiesCount: number;
  newPartiesThisWeek: number;
  itemsCount: number;
  lowStock: number;
  cashBank: number;
};

type SummaryData = {
  sales: number;
  purchases: number;
  expenses: number;
  outputTax: number;
  inputTax: number;
  grossProfit: number;
  receivables: number;
  payables: number;
};

type DaybookEntry = {
  id: string;
  type: "sale" | "purchase" | "expense" | "payment" | string;
  number: string;
  date: string;
  partyName: string;
  grandTotal: number;
};

type OutstandingEntry = {
  id: string;
  name: string;
  type: string;
  balance: number;
};

type StockEntry = {
  id: string;
  name: string;
  unit: string;
  qty: number;
  minStock: number;
  value: number;
  low: boolean;
};

type StockResponse = {
  rows: StockEntry[];
  totalValue: number;
};

// --- KPI Card Sub-component ---
function KPICard({
  label,
  value,
  icon: Icon,
  trend,
  loading
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { text: string; up: boolean };
  loading: boolean;
}) {
  return (
    <Card className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
      <CardContent className="p-0 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {label}
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-450 dark:bg-zinc-900 dark:text-zinc-550">
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>

        {loading ? (
          <div className="space-y-1.5 mt-3">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        ) : (
          <div className="mt-3">
            <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              {value}
            </h2>
            {trend && (
              <div className="mt-1 flex items-center gap-1 text-[10px] font-bold">
                {trend.up ? (
                  <span className="text-green-600 dark:text-green-400">{trend.text}</span>
                ) : (
                  <span className="text-zinc-500 dark:text-zinc-400">{trend.text}</span>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// === 1. Headline KPIs Widget ===
export function DashboardKPIs({ range }: { range: string }) {
  // Default values query for cumulative Cash & Bank / Active Parties (always default today/overall range)
  const { data: dDefault, isLoading: dDefaultLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard", "default"],
    queryFn: () => api.get<DashboardData>("/api/reports/dashboard"),
  });

  // Range-based query for filtered Today's Sales card
  const { data: dRange, isLoading: dRangeLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard", range],
    queryFn: () => api.get<DashboardData>(`/api/reports/dashboard?range=${range}`),
  });

  // Range-based query for filtered Gross Profit card
  const { data: sRange, isLoading: sRangeLoading } = useQuery<SummaryData>({
    queryKey: ["summary", range],
    queryFn: () => api.get<SummaryData>(`/api/reports/summary?range=${range}`),
  });

  const isLoading = dDefaultLoading || dRangeLoading || sRangeLoading;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard
        label={`Sales (${range})`}
        icon={IndianRupee}
        value={formatINR(dRange?.todaySales ?? 0)}
        trend={{ text: "Updated live", up: true }}
        loading={isLoading}
      />
      <KPICard
        label="Cash &amp; Bank"
        icon={Wallet}
        value={formatINR(dDefault?.cashBank ?? 0)}
        trend={
          (dDefault?.cashBank ?? 0) >= 0
            ? { text: "Capital healthy", up: true }
            : { text: "Overdraft alert", up: false }
        }
        loading={isLoading}
      />
      <KPICard
        label="Active Parties"
        icon={Users}
        value={String(dDefault?.partiesCount ?? 0)}
        trend={{ text: "Registered accounts", up: true }}
        loading={isLoading}
      />
      <KPICard
        label={`Gross Profit (${range})`}
        icon={Percent}
        value={formatINR(sRange?.grossProfit ?? 0)}
        trend={
          (sRange?.sales ?? 0) > 0
            ? { text: `${Math.round(((sRange?.grossProfit ?? 0) / (sRange?.sales ?? 1)) * 100)}% Margin`, up: (sRange?.grossProfit ?? 0) > 0 }
            : { text: "No sales logged", up: false }
        }
        loading={isLoading}
      />
    </div>
  );
}

// === 2. Sales vs Expenses SVG Chart ===
export function DashboardCharts({ range }: { range: string }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const { data: trendPoints, isLoading } = useQuery<{ label: string; sales: number; expenses: number }[]>({
    queryKey: ["trend", range],
    queryFn: () => api.get<{ label: string; sales: number; expenses: number }[]>(`/api/reports/trend?range=${range}`),
  });

  if (isLoading) {
    return (
      <Card className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-[180px] w-full" />
      </Card>
    );
  }

  // Pure real-time datasets fetched from the backend (initialized to 0)
  const displaySales = trendPoints?.map(p => p.sales) ?? [];
  const displayExpenses = trendPoints?.map(p => p.expenses) ?? [];
  const labels = trendPoints?.map(p => p.label) ?? [];

  const totalSales = displaySales.reduce((a, b) => a + b, 0);
  const totalExpenses = displayExpenses.reduce((a, b) => a + b, 0);
  const maxVal = Math.max(...displaySales, ...displayExpenses, 1000); // 1000 base threshold

  return (
    <Card className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            Sales &amp; Expense Trend
          </h3>
          <p className="text-xs text-zinc-400">Comparing daily revenue against business outflows</p>
        </div>

        <div className="text-xs font-semibold self-start sm:self-center">
          {hoveredIdx !== null ? (
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 flex items-center gap-2">
              <span className="text-zinc-800 font-bold">{labels[hoveredIdx]}</span>
              <span className="h-3 w-px bg-zinc-300" />
              <span className="text-zinc-650">Sales: <strong className="text-green-600">{formatINR(displaySales[hoveredIdx] ?? 0)}</strong></span>
              <span className="text-zinc-650">Outflow: <strong className="text-red-500">{formatINR(displayExpenses[hoveredIdx] ?? 0)}</strong></span>
            </div>
          ) : (
            <div className="bg-zinc-50 border border-zinc-200 px-2.5 py-1 rounded-lg flex items-center gap-2">
              <span className="text-zinc-400 font-bold">Timeframe Summary</span>
              <span className="h-3 w-px bg-zinc-300" />
              <span className="text-zinc-650">Sales: <strong className="text-green-600">{formatINR(totalSales)}</strong></span>
              <span className="text-zinc-650">Outflow: <strong className="text-red-500">{formatINR(totalExpenses)}</strong></span>
            </div>
          )}
        </div>
      </div>

      <div className="flex h-[180px] w-full mt-2">
        {/* Y-Axis */}
        <div className="flex flex-col justify-between items-end text-[9px] font-bold text-zinc-400 w-12 pr-2 pb-6 pt-1 select-none">
          <span>{formatINR(maxVal, false).split(".")[0]}</span>
          <span>{formatINR(maxVal / 2, false).split(".")[0]}</span>
          <span>0</span>
        </div>

        {/* Chart Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Bars Area */}
          <div className="flex-1 flex justify-between items-end relative border-b border-zinc-200 pb-1">
            {/* Horizontal Grid lines */}
            <div className="absolute inset-x-0 top-[0%] h-px border-t border-dashed border-zinc-200 pointer-events-none" />
            <div className="absolute inset-x-0 top-[50%] h-px border-t border-dashed border-zinc-200 pointer-events-none" />

            {/* Bars */}
            {displaySales.map((salesVal, idx) => {
              const expenseVal = displayExpenses[idx] ?? 0;
              const sPct = (salesVal / maxVal) * 100;
              const ePct = (expenseVal / maxVal) * 100;

              const isHovered = hoveredIdx === idx;
              const hasHover = hoveredIdx !== null;

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col justify-end items-center h-full group/col cursor-pointer relative"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  <div className="flex items-end gap-0.5 h-[90%] w-full justify-center">
                    {/* Sales Bar */}
                    <div
                      className="w-1 bg-green-500 rounded-t transition-all duration-300"
                      style={{
                        height: `${Math.max(sPct, 2)}%`,
                        opacity: hasHover ? (isHovered ? 1.0 : 0.4) : 0.8
                      }}
                    />
                    {/* Outflow Bar */}
                    <div
                      className="w-1 bg-red-500 rounded-t transition-all duration-300"
                      style={{
                        height: `${Math.max(ePct, 2)}%`,
                        opacity: hasHover ? (isHovered ? 1.0 : 0.4) : 0.8
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* X-Axis labels */}
          <div className="flex justify-between items-center pt-2 overflow-hidden">
            {labels.map((lbl, idx) => {
              // Conditionally hide some X-axis labels for dense 30-day graphs to prevent overlap
              const shouldShowLabel = 
                range !== "1M" || 
                idx === 0 || 
                idx === 9 || 
                idx === 19 || 
                idx === 29;

              return (
                <div
                  key={idx}
                  className={cn(
                    "flex-1 text-center text-[9px] font-semibold transition-all duration-200 truncate px-0.5",
                    hoveredIdx === idx ? "text-zinc-800 font-bold" : "text-zinc-400",
                    !shouldShowLabel && "opacity-0 pointer-events-none"
                  )}
                >
                  {lbl}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

// === 3. Searchable Transaction Feed (Daybook) ===
export function DashboardActivity() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "sale" | "purchase" | "expense">("all");

  const { data: daybook, isLoading } = useQuery<DaybookEntry[]>({
    queryKey: ["daybook"],
    queryFn: () => api.get<DaybookEntry[]>("/api/reports/daybook"),
  });

  const getFiltered = () => {
    if (!daybook) return [];
    return daybook.filter(entry => {
      const matchesQ =
        entry.partyName?.toLowerCase().includes(q.toLowerCase()) ||
        entry.number?.toLowerCase().includes(q.toLowerCase());
      const matchesFilter = filter === "all" || entry.type === filter;
      return matchesQ && matchesFilter;
    });
  };

  const list = getFiltered().slice(0, 50);

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "sale":
        return "bg-green-50 text-green-700 border-green-200";
      case "purchase":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "expense":
        return "bg-red-50 text-red-650 border-red-200";
      case "payment_in":
      case "payment_out":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-zinc-55 text-zinc-600 border-zinc-200";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "sale":
        return "Sale";
      case "purchase":
        return "Purchase";
      case "expense":
        return "Expense";
      case "payment_in":
        return "Payment In";
      case "payment_out":
        return "Payment Out";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ");
    }
  };

  return (
    <Card className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Recent Transactions</h3>
          <p className="text-xs text-zinc-400">Latest invoices and operational bills logged</p>
        </div>
        
        {/* Segmented Filter Pills */}
        <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50/50 p-0.5">
          {(["all", "sale", "purchase", "expense"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-semibold transition-all capitalize",
                filter === f
                  ? "bg-white text-zinc-900 shadow-xs border border-zinc-200/50"
                  : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              {f === "all" ? "Show All" : f + "s"}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 relative group">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-zinc-650" />
        <Input
          placeholder="Search by invoice number or party name..."
          value={q}
          onChange={e => setQ(e.target.value)}
          className="pl-9 pr-4 h-9 rounded-lg border-zinc-200 focus-visible:ring-zinc-200 text-xs"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="py-10 text-center">
          <Activity className="mx-auto h-8 w-8 text-zinc-300 animate-pulse" />
          <h4 className="mt-2 text-sm font-bold text-zinc-800">No matching activities</h4>
          <p className="text-xs text-zinc-455 mt-1">Try tweaking filters or adding new transactions.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <div className="grid grid-cols-6 gap-4 px-4 py-2.5 bg-zinc-50/50 border border-zinc-150 rounded-lg text-[9px] font-bold uppercase tracking-wider text-zinc-455 mb-2">
              <div className="col-span-1">Date &amp; Time</div>
              <div className="col-span-1">Reference</div>
              <div className="col-span-2">Party Name</div>
              <div className="col-span-1">Type</div>
              <div className="col-span-1 text-right">Amount</div>
            </div>
            <div className="space-y-1 max-h-[350px] overflow-y-auto pr-1">
              {list.map(entry => {
                const isSale = entry.type === "sale";
                return (
                  <div 
                    key={entry.id} 
                    className="grid grid-cols-6 gap-4 items-center px-4 py-2.5 rounded-lg border border-transparent hover:bg-zinc-50/50 hover:border-zinc-200 transition duration-200 group/tx cursor-pointer"
                  >
                    <div className="col-span-1 text-xs text-zinc-455 font-medium">
                      {new Date(entry.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit"
                      })}
                    </div>
                    <div className="col-span-1">
                      <span className="font-mono text-[10px] font-semibold text-zinc-500 bg-zinc-50 border border-zinc-200 px-1.5 py-0.5 rounded">
                        {entry.number}
                      </span>
                    </div>
                    <div className="col-span-2 font-semibold text-xs text-zinc-800 truncate">
                      {entry.partyName || "Cash Counter Sales"}
                    </div>
                    <div className="col-span-1">
                      <Badge className={cn("text-[9px] py-0.5 px-1.5 h-4.5 font-bold uppercase pointer-events-none rounded border", getTypeStyle(entry.type))} variant="outline">
                        {getTypeLabel(entry.type)}
                      </Badge>
                    </div>
                    <div className={cn("col-span-1 text-right font-bold text-xs tracking-tight", isSale ? "text-green-600" : "text-zinc-900")}>
                      {isSale ? "+" : "-"} {formatINR(entry.grandTotal)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile List View */}
          <div className="md:hidden space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {list.map(entry => {
              const isSale = entry.type === "sale";
              return (
                <div 
                  key={entry.id} 
                  className="group/tx flex items-center justify-between p-3 rounded-lg border border-zinc-150 transition hover:bg-zinc-50/30"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg font-bold text-xs uppercase shadow-xs",
                        entry.type === "sale" && "bg-green-50 text-green-600 border border-green-200",
                        entry.type === "purchase" && "bg-amber-50 text-amber-700 border border-amber-200",
                        entry.type === "expense" && "bg-red-50 text-red-650 border border-red-200",
                        entry.type !== "sale" && entry.type !== "purchase" && entry.type !== "expense" && "bg-blue-50 text-blue-600 border border-blue-200"
                      )}
                    >
                      {entry.type === "sale" && <FileText className="h-4 w-4" />}
                      {entry.type === "purchase" && <ShoppingCart className="h-4 w-4" />}
                      {entry.type === "expense" && <Zap className="h-4 w-4" />}
                      {entry.type !== "sale" && entry.type !== "purchase" && entry.type !== "expense" && <Activity className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-zinc-800">
                          {entry.partyName || "Cash Counter Sales"}
                        </span>
                        <Badge variant="outline" className="text-[9px] py-0 px-1 h-4 uppercase border-zinc-200 bg-zinc-50 text-zinc-450 font-mono tracking-tight">
                          {entry.number}
                        </Badge>
                      </div>
                      <p className="text-[9px] text-zinc-400 font-medium mt-0.5">
                        {new Date(entry.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span
                        className={cn(
                          "text-xs font-bold tracking-tight",
                          isSale ? "text-green-600" : "text-zinc-900"
                        )}
                      >
                        {isSale ? "+" : "-"} {formatINR(entry.grandTotal)}
                      </span>
                      <p className="text-[9px] font-semibold text-zinc-400 capitalize mt-0.5">{entry.type}</p>
                    </div>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-50 text-zinc-400 opacity-0 group-hover/tx:opacity-100 group-hover/tx:translate-x-0.5">
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}

// === 4. Dues, GST, and Stock Warning Center ===
export function DashboardAlerts() {
  const { data: s, isLoading: sLoading } = useQuery<SummaryData>({
    queryKey: ["summary", "monthly"],
    queryFn: () => api.get<SummaryData>("/api/reports/summary?monthOnly=true"),
  });

  const { data: outstanding, isLoading: oLoading } = useQuery<OutstandingEntry[]>({
    queryKey: ["outstanding"],
    queryFn: () => api.get<OutstandingEntry[]>("/api/reports/outstanding"),
  });

  const { data: stock, isLoading: kLoading } = useQuery<StockResponse>({
    queryKey: ["stock"],
    queryFn: () => api.get<StockResponse>("/api/reports/stock"),
  });

  const isLoading = sLoading || oLoading || kLoading;

  if (isLoading) {
    return (
      <Card className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="h-16 w-full mb-3" />
        <Skeleton className="h-24 w-full" />
      </Card>
    );
  }

  const receivablesList = outstanding?.filter(p => p.balance > 0).slice(0, 3) || [];
  const payablesList = outstanding?.filter(p => p.balance < 0).slice(0, 3) || [];
  const lowStockProducts = stock?.rows.filter(it => it.low) || [];

  const totRec = s?.receivables ?? 0;
  const totPay = s?.payables ?? 0;
  const grandDues = totRec + totPay;
  const recRatio = grandDues > 0 ? (totRec / grandDues) * 100 : 50;

  return (
    <div className="space-y-6">
      {/* Quick P&L Breakdown Panel */}
      <Card className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Operating Balance</h3>
        <p className="text-xs text-zinc-400 mb-6">Net financial breakdown</p>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 border border-zinc-150 rounded-xl bg-zinc-50/50">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-455">Total Sales</p>
              <h4 className="text-lg font-bold text-green-600 mt-0.5">{formatINR(s?.sales ?? 0)}</h4>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600">
              <ArrowUpRight className="h-4.5 w-4.5" />
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 border border-zinc-150 rounded-xl bg-zinc-50/50">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-455">Purchases &amp; Expenses</p>
              <h4 className="text-lg font-bold text-red-500 mt-0.5">
                {formatINR((s?.purchases ?? 0) + (s?.expenses ?? 0))}
              </h4>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500">
              <ArrowDownRight className="h-4.5 w-4.5" />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-150 bg-zinc-50/50 p-4">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-zinc-700">
              <span>Gross Profit Margin</span>
              <span className={cn(
                "font-bold px-1.5 py-0.5 rounded text-[10px]",
                (s?.sales && s.sales > 0 && s.grossProfit >= 0) 
                  ? "bg-green-50 text-green-700 border border-green-200" 
                  : "bg-red-55 text-red-600 border border-red-200"
              )}>
                {s?.sales && s.sales > 0 ? `${Math.round((s.grossProfit / s.sales) * 100)}%` : "0%"}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-zinc-200 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  (s?.sales && s.sales > 0 && s.grossProfit >= 0) 
                    ? "bg-green-600" 
                    : "bg-red-550"
                )}
                style={{
                  width: `${Math.min(
                    Math.max(s?.sales && s.sales > 0 ? (s.grossProfit / s.sales) * 100 : 0, 0),
                    100
                  )}%`
                }}
              />
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-zinc-400">
              GPM shows standard markup profitability across inventory trades and service billings.
            </p>
          </div>
        </div>
      </Card>

      {/* 4a. Accounts Receivable vs Payable Progress bar */}
      <Card className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Dues &amp; Collections</h3>
        <p className="text-xs text-zinc-400 mb-4">Outstanding balance ratio</p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 text-xs font-semibold">
            <div>
              <p className="text-zinc-400">Receivable</p>
              <p className="text-sm font-bold text-green-600">{formatINR(totRec)}</p>
            </div>
            <div className="text-right">
              <p className="text-zinc-400">Payable</p>
              <p className="text-sm font-bold text-red-500">{formatINR(totPay)}</p>
            </div>
          </div>

          <div className="h-3.5 w-full flex rounded-full overflow-hidden bg-zinc-150">
            {grandDues === 0 ? (
              <div className="h-full w-full bg-zinc-200" />
            ) : (
              <>
                <div className="h-full bg-green-600 transition-all duration-500" style={{ width: `${recRatio}%` }} />
                <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${100 - recRatio}%` }} />
              </>
            )}
          </div>

          {receivablesList.length > 0 && (
            <div className="pt-3 border-t border-zinc-100">
              <h4 className="text-[9px] font-bold uppercase tracking-wider text-green-700 mb-2">
                Top Collections
              </h4>
              <div className="space-y-2">
                {receivablesList.map(p => (
                  <div key={p.id} className="flex justify-between items-center text-xs p-1.5 rounded-lg hover:bg-zinc-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-50 text-[9px] font-bold text-green-700 border border-green-200">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-zinc-700 font-semibold truncate max-w-[150px]">{p.name}</span>
                    </div>
                    <span className="font-bold text-green-600">{formatINR(p.balance)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {payablesList.length > 0 && (
            <div className="pt-3 border-t border-zinc-100">
              <h4 className="text-[9px] font-bold uppercase tracking-wider text-red-650 mb-2">
                Top Dues
              </h4>
              <div className="space-y-2">
                {payablesList.map(p => (
                  <div key={p.id} className="flex justify-between items-center text-xs p-1.5 rounded-lg hover:bg-zinc-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-50 text-[9px] font-bold text-red-600 border border-red-200">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-zinc-700 font-semibold truncate max-w-[150px]">{p.name}</span>
                    </div>
                    <span className="font-bold text-red-500">{formatINR(Math.abs(p.balance))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 4c. Low Stock Alerts */}
      <Card className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Stock Level Alerts</h3>
            <p className="text-xs text-zinc-400">Products currently below threshold levels</p>
          </div>
          {lowStockProducts.length > 0 && (
            <Badge variant="destructive" className="bg-red-600 text-white font-bold h-4 px-1.5 rounded-full">
              {lowStockProducts.length}
            </Badge>
          )}
        </div>

        {lowStockProducts.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50/20 p-3.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-green-100 text-green-700">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-green-800">All Items Stocked</h4>
              <p className="text-[10px] font-semibold text-green-600 mt-0.5">No critical shortages identified.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
            {lowStockProducts.slice(0, 4).map(it => {
              const pct = it.minStock > 0 ? Math.min((it.qty / it.minStock) * 100, 100) : 0;
              return (
                <div
                  key={it.id}
                  className="flex flex-col justify-between rounded-lg border border-zinc-150 bg-zinc-50/30 p-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-zinc-900 truncate" title={it.name}>
                        {it.name}
                      </h4>
                      <p className="text-[9px] text-zinc-400 font-semibold mt-0.5">
                        Threshold: {it.minStock} {it.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-red-600">
                        {it.qty} {it.unit}
                      </span>
                      <p className="text-[9px] font-semibold text-zinc-400 mt-0.5 uppercase tracking-wider">Shortage</p>
                    </div>
                  </div>
                  <div className="mt-2.5 space-y-1">
                    <div className="h-1 w-full rounded-full bg-zinc-200 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-red-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-semibold text-zinc-400">
                      <span>Stock ratio: {Math.round(pct)}%</span>
                      <span>Critical</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {lowStockProducts.length > 4 && (
              <p className="text-[10px] text-center text-zinc-400 font-bold mt-2 hover:text-zinc-600 cursor-pointer transition">
                + {lowStockProducts.length - 4} more items running low
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

// === 5. Quick Actions Grid ===
export function QuickActions() {
  const actions = [
    { href: "/invoices", label: "Create Sale", icon: FileText, textClass: "text-green-700 hover:bg-green-50/50 border-green-200 bg-green-50/10" },
    { href: "/purchases", label: "Record Purchase", icon: ShoppingCart, textClass: "text-red-700 hover:bg-red-50/50 border-red-200 bg-red-50/10" },
    { href: "/pos", label: "POS Billing", icon: Zap, textClass: "text-amber-700 hover:bg-amber-50/50 border-amber-200 bg-amber-50/10" },
    { href: "/parties", label: "Add Party", icon: Users, textClass: "text-blue-700 hover:bg-blue-50/50 border-blue-200 bg-blue-50/10" },
    { href: "/items", label: "Add Item", icon: Package, textClass: "text-zinc-700 hover:bg-zinc-150 border-zinc-200 bg-zinc-50/50" },
  ];

  return (
    <Card className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Quick Actions</h3>
        <p className="text-xs text-zinc-400">Frequently used billing and logging procedures</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mt-4">
        {actions.map(a => (
          <Button
            key={a.href}
            asChild
            variant="outline"
            className={cn(
              "h-10 rounded-lg font-bold text-xs border flex items-center justify-center gap-2 transition px-3",
              a.textClass
            )}
          >
            <a href={a.href} className="flex items-center gap-2">
              <a.icon className="h-4 w-4 shrink-0" />
              <span>{a.label}</span>
            </a>
          </Button>
        ))}
      </div>
    </Card>
  );
}
