"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatINR } from "@invoixe/core";
import { api } from "../../lib/api";
import Link from "next/link";
import { PageHeader } from "../../components/page-header";
import { DataTable, type Column } from "../../components/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ShoppingCart,
  TrendingDown,
  Users,
  Search,
  PlusCircle,
  Calendar,
  Filter,
  ArrowRight,
} from "lucide-react";

type Row = {
  id: string;
  number: string;
  date: string;
  partyName: string | null;
  referenceNo: string | null;
  grandTotal: number;
  subTotal: number;
  totalTax: number;
  status: string;
  lines?: { description: string; qty: number }[];
};

export default function PurchasesPage() {
  const { data, isLoading, error } = useQuery<Row[]>({
    queryKey: ["purchases"],
    queryFn: () => api.get<Row[]>("/api/purchases"),
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const stats = useMemo(() => {
    if (!data) return { total: 0, count: 0, tax: 0, avgBill: 0 };
    const total = data.reduce((s, r) => s + r.grandTotal, 0);
    const tax = data.reduce((s, r) => s + r.totalTax, 0);
    return {
      total,
      tax,
      count: data.length,
      avgBill: data.length ? total / data.length : 0,
    };
  }, [data]);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    return data.filter((r) => {
      const matchesSearch =
        (r.number?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (r.partyName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (r.referenceNo?.toLowerCase() || "").includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data, searchQuery, statusFilter]);

  const columns: Column<Row>[] = [
    {
      key: "date",
      header: "Date",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          <span className="text-xs font-bold text-zinc-550 dark:text-zinc-400">
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
      header: "Bill No",
      cell: (r) => (
        <span className="font-mono text-xs font-black text-zinc-900 dark:text-zinc-200">
          {r.number}
        </span>
      ),
    },
    {
      key: "refno",
      header: "Supplier Ref",
      cell: (r) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {r.referenceNo || "—"}
        </span>
      ),
    },
    {
      key: "supplier",
      header: "Supplier",
      cell: (r) => (
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          {r.partyName || "—"}
        </span>
      ),
    },
    {
      key: "items",
      header: "Items",
      cell: (r) => (
        <span className="text-[11px] text-zinc-400 font-bold">
          {r.lines?.length ?? 0} line{(r.lines?.length ?? 0) !== 1 ? "s" : ""}
        </span>
      ),
    },
    {
      key: "tax",
      header: "Tax Paid",
      align: "right",
      cell: (r) => (
        <span className="text-xs font-semibold text-zinc-500">
          {formatINR(r.totalTax)}
        </span>
      ),
    },
    {
      key: "grandTotal",
      header: "Bill Total",
      align: "right",
      cell: (r) => (
        <span className="font-black font-mono text-red-600 dark:text-red-400 text-sm">
          {formatINR(r.grandTotal)}
        </span>
      ),
    },
    {
      key: "action",
      header: "",
      align: "right",
      cell: () => (
        <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 transition" />
      ),
    },
  ];

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <PageHeader
        title="Purchase Bills"
        description="Track supplier invoices, record input GST, and manage payment settlements."
      >
        <Link href="/purchases/new">
          <Button className="h-9 gap-2 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm hover:bg-primary/95">
            <PlusCircle className="h-4 w-4" />
            New Purchase Bill
          </Button>
        </Link>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
          <CardContent className="p-0 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Total Purchases
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-450 dark:bg-zinc-900 dark:text-zinc-550">
                <TrendingDown className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <h2 className="text-xl font-extrabold tracking-tight text-red-650 dark:text-red-400">
                {formatINR(stats.total)}
              </h2>
              <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
                Across {stats.count} supplier bill{stats.count !== 1 ? "s" : ""}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
          <CardContent className="p-0 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Input GST Paid
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-450 dark:bg-zinc-900 dark:text-zinc-550">
                <ShoppingCart className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                {formatINR(stats.tax)}
              </h2>
              <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
                Claimable CGST + SGST / IGST credit
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
          <CardContent className="p-0 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Average Bill Size
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-450 dark:bg-zinc-900 dark:text-zinc-550">
                <Users className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                {formatINR(stats.avgBill)}
              </h2>
              <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
                Per supplier purchase order
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by bill no, supplier name, supplier reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 py-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-zinc-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950 dark:text-white font-semibold"
            >
              <option value="all">All Status</option>
              <option value="final">Final</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <DataTable
        columns={columns}
        rows={filteredRows}
        getRowKey={(r) => r.id}
        isLoading={isLoading}
        error={error}
        emptyMessage={
          <div className="py-14 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 mb-3 border dark:border-zinc-850">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200">
              No Purchase Bills Yet
            </h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-[280px]">
              Start by creating your first supplier purchase bill to track input GST credits.
            </p>
            <Link href="/purchases/new">
              <Button className={cn("mt-4 h-9 gap-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs")}>
                <PlusCircle className="h-3.5 w-3.5" />
                Create First Bill
              </Button>
            </Link>
          </div>
        }
        className="border border-zinc-200 dark:border-zinc-850 rounded-2xl shadow-xs overflow-hidden"
      />
    </main>
  );
}
