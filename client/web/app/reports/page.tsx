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
} from "lucide-react";
import { formatINR } from "@invoixe/core";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/page-header";
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

/* ── flat metric card ── */
function MetricCard({
  label,
  value,
  icon: Icon,
  valueClass,
  sub,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  valueClass?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-50 text-zinc-400 border border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800">
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className={cn("text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50", valueClass)}>
        {formatINR(value)}
      </p>
      {sub && <p className="mt-1 text-[10px] font-medium text-zinc-400">{sub}</p>}
    </div>
  );
}

/* ── section heading ── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">{children}</h2>
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

  const outputTax = gst?.output.total ?? 0;
  const inputTax = gst?.input.total ?? 0;
  const gstBarTotal = outputTax + inputTax;
  const outputPct = gstBarTotal > 0 ? Math.round((outputTax / gstBarTotal) * 100) : 0;

  return (
    <main className="mx-auto max-w-[1600px] px-4 sm:px-6 py-8 space-y-8">
      <PageHeader
        title="Reports"
        description="Financial overview — sales, purchases, tax liabilities, outstanding balances, and stock health."
        backHref="/"
        backLabel="Dashboard"
      />

      {/* ── P&L KPIs ── */}
      <div>
        <SectionLabel>Profit &amp; Loss</SectionLabel>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Sales"
            value={s?.sales ?? 0}
            icon={TrendingUp}
            valueClass="text-green-600"
            sub="All invoices this period"
          />
          <MetricCard
            label="Purchases"
            value={s?.purchases ?? 0}
            icon={ShoppingCart}
            sub="Supplier bills recorded"
          />
          <MetricCard
            label="Expenses"
            value={s?.expenses ?? 0}
            icon={Wallet}
            valueClass={(s?.expenses ?? 0) > 0 ? "text-red-500" : undefined}
            sub="Operational outflows"
          />
          <MetricCard
            label="Gross Profit"
            value={s?.grossProfit ?? 0}
            icon={BarChart3}
            valueClass={profitPositive ? "text-green-600" : "text-red-500"}
            sub={profitPositive ? "You are in profit" : "Net loss this period"}
          />
        </div>
      </div>

      {/* ── Balances KPIs ── */}
      <div>
        <SectionLabel>Balances &amp; Tax</SectionLabel>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Receivables"
            value={s?.receivables ?? 0}
            icon={ArrowUpRight}
            valueClass="text-green-600"
            sub="Owed to you by customers"
          />
          <MetricCard
            label="Payables"
            value={s?.payables ?? 0}
            icon={ArrowDownRight}
            valueClass={(s?.payables ?? 0) > 0 ? "text-red-500" : undefined}
            sub="You owe to suppliers"
          />
          <MetricCard
            label="Output GST"
            value={s?.outputTax ?? 0}
            icon={Receipt}
            sub="Tax collected on sales"
          />
          <MetricCard
            label="Input GST Credit"
            value={s?.inputTax ?? 0}
            icon={PieChart}
            sub="ITC from purchases"
          />
        </div>
      </div>

      {/* ── Details Grid ── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* GST 3B */}
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-5 py-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">GST Summary (3B)</h3>
              <p className="text-xs text-zinc-400">Output vs input tax credit</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-400 border border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800">
              <Receipt className="h-4 w-4" />
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Output vs Input */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Output Tax</p>
                <p className="text-base font-extrabold text-zinc-800 dark:text-zinc-100">{formatINR(outputTax)}</p>
              </div>
              <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Input Credit</p>
                <p className="text-base font-extrabold text-zinc-800 dark:text-zinc-100">{formatINR(inputTax)}</p>
              </div>
            </div>

            {/* GST Progress bar */}
            {gstBarTotal > 0 && (
              <div className="space-y-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-zinc-700 dark:bg-zinc-400 transition-all"
                    style={{ width: `${outputPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-semibold text-zinc-400">
                  <span>Output {outputPct}%</span>
                  <span>Input {100 - outputPct}%</span>
                </div>
              </div>
            )}

            {/* Net Payable */}
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3">
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Net Payable</p>
              <p className={cn("text-base font-extrabold", gstNetPositive ? "text-red-500" : "text-green-600")}>
                {formatINR(gst?.netPayable ?? 0)}
              </p>
            </div>

            {/* GST Status */}
            {gstNetPositive ? (
              <p className="text-[10px] font-semibold text-red-500 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Tax liability due. File your GSTR-3B on time.
              </p>
            ) : (
              <p className="text-[10px] font-semibold text-green-600 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                ITC surplus — no tax payable this period.
              </p>
            )}
          </div>
        </div>

        {/* Party Outstanding */}
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-5 py-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Party Outstanding</h3>
              <p className="text-xs text-zinc-400">Pending receivables and payables</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-400 border border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800">
              <Users className="h-4 w-4" />
            </div>
          </div>

          {!out || out.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-zinc-400">
              <CheckCircle2 className="h-7 w-7 text-green-500" />
              <p className="text-sm font-semibold text-zinc-700">All accounts settled</p>
              <p className="text-xs">No outstanding balances.</p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {/* Column headers */}
              <div className="grid grid-cols-5 gap-2 px-5 py-2.5 bg-zinc-50/60 dark:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-800">
                <div className="col-span-3 text-[9px] font-bold uppercase tracking-wider text-zinc-400">Party</div>
                <div className="col-span-2 text-right text-[9px] font-bold uppercase tracking-wider text-zinc-400">Balance</div>
              </div>
              {out.map((r) => (
                <div
                  key={r.id}
                  className="grid grid-cols-5 gap-2 items-center px-5 py-3 border-b border-zinc-50 dark:border-zinc-900 last:border-none hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors"
                >
                  <div className="col-span-3 min-w-0">
                    <Link
                      href={`/parties/${r.id}`}
                      className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:text-zinc-600 truncate block transition-colors"
                    >
                      {r.name}
                    </Link>
                    <p className="text-[9px] text-zinc-400 capitalize font-medium mt-0.5">{r.type}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className={cn("text-xs font-bold", r.balance > 0 ? "text-green-600" : "text-red-500")}>
                      {formatINR(Math.abs(r.balance))}
                    </p>
                    <p className={cn("text-[9px] font-semibold mt-0.5", r.balance > 0 ? "text-green-500" : "text-red-400")}>
                      {r.balance > 0 ? "Receivable" : "Payable"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stock Summary */}
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-100 dark:border-zinc-800 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Stock Summary</h3>
                <p className="text-xs text-zinc-400">Inventory levels and valuation</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-400 border border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Total Inventory Value</span>
              <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-100">{formatINR(stock?.totalValue ?? 0)}</span>
            </div>
            {lowStockItems.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">
                <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
                {lowStockItems.length} item{lowStockItems.length > 1 ? "s" : ""} running low on stock
              </div>
            )}
          </div>

          {!stock || stock.rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-zinc-400">
              <Package className="h-7 w-7" />
              <p className="text-sm font-semibold text-zinc-700">No products tracked</p>
              <p className="text-xs">Enable stock maintenance in settings.</p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {/* Column headers */}
              <div className="grid grid-cols-5 gap-2 px-5 py-2.5 bg-zinc-50/60 dark:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-800">
                <div className="col-span-3 text-[9px] font-bold uppercase tracking-wider text-zinc-400">Item</div>
                <div className="col-span-2 text-right text-[9px] font-bold uppercase tracking-wider text-zinc-400">Stock</div>
              </div>
              {stock.rows.map((r) => (
                <div
                  key={r.id}
                  className={cn(
                    "grid grid-cols-5 gap-2 items-center px-5 py-3 border-b border-zinc-50 dark:border-zinc-900 last:border-none transition-colors",
                    r.low ? "bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-50/50" : "hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20"
                  )}
                >
                  <div className="col-span-3 flex items-center gap-2 min-w-0">
                    {r.low && <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />}
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 truncate">{r.name}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className={cn("text-xs font-bold", r.low ? "text-amber-600" : "text-zinc-700 dark:text-zinc-300")}>
                      {r.qty} units
                    </p>
                    <p className="text-[9px] text-zinc-400 mt-0.5">{formatINR(r.value)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
