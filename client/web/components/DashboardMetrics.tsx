"use client";

import { useQuery } from "@tanstack/react-query";
import { IndianRupee, Users, Package, Wallet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatINR } from "@leafx/core";
import { api } from "../lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Dashboard = {
  todaySales: number;
  partiesCount: number;
  newPartiesThisWeek: number;
  itemsCount: number;
  lowStock: number;
  cashBank: number;
};

export function DashboardMetrics() {
  const { data: d, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<Dashboard>("/api/reports/dashboard"),
  });

  return (
    <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <MetricCard
        label="Today's Sales"
        icon={IndianRupee}
        value={formatINR(d?.todaySales ?? 0)}
        foot="As of today"
        loading={isLoading}
      />
      <MetricCard
        label="Active Parties"
        icon={Users}
        value={`${d?.partiesCount ?? 0} Accounts`}
        foot={(d?.newPartiesThisWeek ?? 0) > 0 ? `${d?.newPartiesThisWeek} new this week` : "No new this week"}
        loading={isLoading}
      />
      <MetricCard
        label="Inventory Items"
        icon={Package}
        value={`${d?.itemsCount ?? 0} Products`}
        loading={isLoading}
        pill={
          (d?.lowStock ?? 0) > 0
            ? { tone: "warn", icon: AlertTriangle, text: `${d?.lowStock} low stock` }
            : { tone: "ok", icon: CheckCircle2, text: "All stocked" }
        }
      />
      <MetricCard
        label="Cash & Bank"
        icon={Wallet}
        value={formatINR(d?.cashBank ?? 0)}
        loading={isLoading}
        pill={
          (d?.cashBank ?? 0) >= 0
            ? { tone: "ok", icon: CheckCircle2, text: "Healthy" }
            : { tone: "bad", icon: AlertTriangle, text: "Negative" }
        }
      />
    </div>
  );
}

type Pill = { tone: "ok" | "warn" | "bad"; icon: typeof CheckCircle2; text: string };

function MetricCard({
  label,
  icon: Icon,
  value,
  foot,
  pill,
  loading,
}: {
  label: string;
  icon: typeof IndianRupee;
  value: string;
  foot?: string;
  pill?: Pill;
  loading?: boolean;
}) {
  return (
    <Card className="rounded-2xl border-gray-100 shadow-sm">
      <CardContent className="flex flex-col justify-between gap-3 p-5">
        <div className="flex items-start justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</span>
          <Icon className="h-4 w-4 text-green-600/70" />
        </div>
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <h2 className="text-xl font-bold text-gray-900">{value}</h2>
        )}
        {pill ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 self-start rounded-full px-2 py-0.5 text-xs font-semibold",
              pill.tone === "ok" && "bg-green-50 text-green-600",
              pill.tone === "warn" && "bg-amber-50 text-amber-600",
              pill.tone === "bad" && "bg-red-50 text-red-600"
            )}
          >
            <pill.icon className="h-3 w-3" />
            {pill.text}
          </span>
        ) : (
          foot && <span className="text-xs font-medium text-gray-500">{foot}</span>
        )}
      </CardContent>
    </Card>
  );
}
