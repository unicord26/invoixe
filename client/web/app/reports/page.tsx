"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Users,
  Receipt,
  ShoppingCart,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  PieChart,
  Minus,
} from "lucide-react";
import { formatINR } from "@invoixe/core";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/* ── types ── */
type Summary = {
  sales: number;
  purchases: number;
  expenses: number;
  outputTax: number;
  inputTax: number;
  grossProfit: number;
  receivables: number;
  payables: number;
};
type Gst = { output: { total: number }; input: { total: number }; netPayable: number };
type Outstanding = { id: string; name: string; type: string; balance: number };
type Stock = { rows: { id: string; name: string; qty: number; value: number; low: boolean }[]; totalValue: number };

/* ── metric card ── */
function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
  sub,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone?: "positive" | "negative" | "neutral" | "warning";
  sub?: string;
}) {
  const toneMap = {
    positive: {
      bg: "bg-teal-50 dark:bg-teal-950/20",
      icon: "text-teal-600 bg-teal-100 dark:bg-teal-900/30",
      value: "text-teal-700 dark:text-teal-400",
      badge: <ArrowUpRight className="h-3.5 w-3.5 text-teal-500" />,
    },
    negative: {
      bg: "bg-red-50/60 dark:bg-red-950/10",
      icon: "text-red-500 bg-red-100 dark:bg-red-900/30",
      value: "text-red-600 dark:text-red-400",
      badge: <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />,
    },
    warning: {
      bg: "bg-amber-50/60 dark:bg-amber-950/10",
      icon: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
      value: "text-amber-700 dark:text-amber-400",
      badge: <Minus className="h-3.5 w-3.5 text-amber-500" />,
    },
    neutral: {
      bg: "bg-slate-50 dark:bg-slate-900/20",
      icon: "text-slate-500 bg-slate-100 dark:bg-slate-800",
      value: "text-slate-800 dark:text-slate-200",
      badge: null,
    },
  };

  const t = toneMap[tone ?? "neutral"];

  return (
    <div className={cn("rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm transition-all hover:shadow-md", t.bg)}>
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", t.icon)}>
          <Icon className="h-5 w-5" />
        </div>
        {t.badge && (
          <div className="flex items-center gap-0.5 rounded-full bg-white/70 dark:bg-slate-900/50 px-1.5 py-0.5 border border-slate-100 dark:border-slate-800">
            {t.badge}
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p className={cn("mt-1 text-2xl font-extrabold tracking-tight", t.value)}>
          {formatINR(value)}
        </p>
        {sub && <p className="mt-1 text-[11px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

/* ── gst ratio bar ── */
function GstBar({ output, input }: { output: number; input: number }) {
  const total = output + input;
  if (total === 0) return null;
  const outputPct = Math.round((output / total) * 100);
  return (
    <div className="mt-3 space-y-1">
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400 transition-all"
          style={{ width: `${outputPct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>Output {outputPct}%</span>
        <span>Input {100 - outputPct}%</span>
      </div>
    </div>
  );
}

/* ── page ── */
export default function ReportsPage() {
  const { data: s } = useQuery({ queryKey: ["r-summary"], queryFn: () => api.get<Summary>("/api/reports/summary") });
  const { data: gst } = useQuery({ queryKey: ["r-gst"], queryFn: () => api.get<Gst>("/api/reports/gst") });
  const { data: out } = useQuery({ queryKey: ["r-out"], queryFn: () => api.get<Outstanding[]>("/api/reports/outstanding") });
  const { data: stock } = useQuery({ queryKey: ["r-stock"], queryFn: () => api.get<Stock>("/api/reports/stock") });

  const profitPositive = (s?.grossProfit ?? 0) >= 0;
  const gstNetPositive = (gst?.netPayable ?? 0) >= 0;
  const lowStockItems = stock?.rows.filter((r) => r.low) ?? [];

  return (
    <main className="mx-auto max-w-[1600px] px-4 sm:px-6 py-8">
      <PageHeader
        title="Reports"
        description="Financial overview — sales, purchases, tax liabilities, outstanding balances, and stock health."
        backHref="/"
        backLabel="Dashboard"
      />

      {/* ── top KPI row ── */}
      <div className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Sales" value={s?.sales ?? 0} icon={TrendingUp} tone="positive" sub="All invoices this period" />
        <MetricCard label="Purchases" value={s?.purchases ?? 0} icon={ShoppingCart} tone="neutral" sub="Supplier bills recorded" />
        <MetricCard label="Expenses" value={s?.expenses ?? 0} icon={Wallet} tone="negative" sub="Operational expenses" />
        <MetricCard
          label="Gross Profit"
          value={s?.grossProfit ?? 0}
          icon={BarChart3}
          tone={profitPositive ? "positive" : "negative"}
          sub={profitPositive ? "You are in profit" : "Net loss this period"}
        />
      </div>

      {/* ── receivables / payables / gst row ── */}
      <div className="mb-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Receivables" value={s?.receivables ?? 0} icon={ArrowUpRight} tone="positive" sub="Owed to you by customers" />
        <MetricCard label="Payables" value={s?.payables ?? 0} icon={ArrowDownRight} tone="negative" sub="You owe to suppliers" />
        <MetricCard label="Output GST" value={s?.outputTax ?? 0} icon={Receipt} tone="warning" sub="Tax collected on sales" />
        <MetricCard label="Input GST Credit" value={s?.inputTax ?? 0} icon={PieChart} tone="neutral" sub="ITC from purchases" />
      </div>

      {/* ── GST 3B summary + outstanding + stock ── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* GST 3B */}
        <Card className="border-slate-100 dark:border-slate-800 shadow-sm">
          <CardHeader className="border-b border-slate-50 dark:border-slate-900 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/20 text-violet-600">
                <Receipt className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">GST Summary (3B)</CardTitle>
                <CardDescription className="text-xs">Output vs input tax credit</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Output Tax</p>
                <p className="mt-1 text-base font-extrabold text-slate-800 dark:text-slate-200">
                  {formatINR(gst?.output.total ?? 0)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Input Credit</p>
                <p className="mt-1 text-base font-extrabold text-slate-800 dark:text-slate-200">
                  {formatINR(gst?.input.total ?? 0)}
                </p>
              </div>
            </div>

            <GstBar output={gst?.output.total ?? 0} input={gst?.input.total ?? 0} />

            <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Net Payable</p>
              <p className={cn("text-base font-extrabold", gstNetPositive ? "text-red-600 dark:text-red-400" : "text-teal-600 dark:text-teal-400")}>
                {formatINR(gst?.netPayable ?? 0)}
              </p>
            </div>

            {gstNetPositive ? (
              <p className="text-[11px] text-red-500 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Tax liability due. File your GSTR-3B on time.
              </p>
            ) : (
              <p className="text-[11px] text-teal-600 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                ITC surplus — no tax payable this period.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Outstanding balances */}
        <Card className="border-slate-100 dark:border-slate-800 shadow-sm">
          <CardHeader className="border-b border-slate-50 dark:border-slate-900 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-600">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Party Outstanding</CardTitle>
                <CardDescription className="text-xs">Pending receivables and payables</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!out || out.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
                <CheckCircle2 className="h-8 w-8 text-teal-400" />
                <p className="text-sm font-medium">All accounts settled</p>
                <p className="text-xs">No outstanding balances.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50 dark:divide-slate-900 max-h-72 overflow-y-auto">
                {out.map((r) => (
                  <li key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    <div>
                      <Link
                        href={`/parties/${r.id}`}
                        className="text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                      >
                        {r.name}
                      </Link>
                      <p className="text-[10px] text-slate-400 capitalize">{r.type}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-sm font-bold", r.balance > 0 ? "text-teal-600 dark:text-teal-400" : "text-red-500 dark:text-red-400")}>
                        {formatINR(Math.abs(r.balance))}
                      </p>
                      <p className={cn("text-[10px] font-semibold", r.balance > 0 ? "text-teal-500" : "text-red-400")}>
                        {r.balance > 0 ? "Receivable" : "Payable"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Stock summary */}
        <Card className="border-slate-100 dark:border-slate-800 shadow-sm">
          <CardHeader className="border-b border-slate-50 dark:border-slate-900 pb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/20 text-teal-600">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Stock Summary</CardTitle>
                  <CardDescription className="text-xs">Inventory levels and valuation</CardDescription>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Value</p>
                <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{formatINR(stock?.totalValue ?? 0)}</p>
              </div>
            </div>
            {lowStockItems.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-amber-100 dark:border-amber-900/20 bg-amber-50/50 dark:bg-amber-950/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {lowStockItems.length} item{lowStockItems.length > 1 ? "s" : ""} running low on stock
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {!stock || stock.rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
                <Package className="h-8 w-8" />
                <p className="text-sm font-medium">No products tracked</p>
                <p className="text-xs">Enable stock maintenance in settings.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50 dark:divide-slate-900 max-h-72 overflow-y-auto">
                {stock.rows.map((r) => (
                  <li key={r.id} className={cn("flex items-center justify-between px-5 py-3 transition-colors", r.low && "bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-50/50")}>
                    <div className="flex items-center gap-2 min-w-0">
                      {r.low && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{r.name}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className={cn("text-sm font-bold", r.low ? "text-amber-600 dark:text-amber-400" : "text-slate-700 dark:text-slate-300")}>
                        {r.qty} units
                      </p>
                      <p className="text-[10px] text-slate-400">{formatINR(r.value)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
