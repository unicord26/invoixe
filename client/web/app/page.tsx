"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, RefreshCw } from "lucide-react";
import {
  DashboardKPIs,
  DashboardCharts,
  DashboardActivity,
  DashboardAlerts,
  QuickActions
} from "@/components/dashboard-metrics";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Home() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState("Welcome back");
  const [range, setRange] = useState<"1D" | "7D" | "1M" | "1Y" | "5Y" | "All">("7D");

  useEffect(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) setGreeting("Good Morning");
    else if (hrs < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["summary"] }),
      queryClient.invalidateQueries({ queryKey: ["trend"] }),
      queryClient.invalidateQueries({ queryKey: ["daybook"] }),
      queryClient.invalidateQueries({ queryKey: ["stock"] }),
      queryClient.invalidateQueries({ queryKey: ["outstanding"] })
    ]);
    setTimeout(() => {
      setRefreshing(false);
      toast.success("Dashboard metrics refreshed successfully!");
    }, 500);
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* 1. Header / Welcome Area */}
      <div className="flex flex-col justify-between gap-4 border-b border-gray-100 pb-6 md:flex-row md:items-center dark:border-zinc-800">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            {greeting}, User
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and administer your business accounts and GST filings in real-time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Range Selector Switcher */}
          <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-0.5 shadow-inner">
            {(["1D", "7D", "1M", "1Y", "5Y", "All"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                  range === r
                    ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/50"
                    : "text-zinc-500 hover:text-zinc-900"
                )}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Refresh Action */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-9 gap-2 rounded-xl text-gray-500 border-gray-200 dark:border-zinc-800 dark:text-zinc-400"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {/* Real-time date display */}
          <div className="flex h-9 items-center gap-2 rounded-xl bg-gray-100 px-4 text-xs font-bold text-gray-500 dark:bg-zinc-900 dark:text-zinc-400">
            <CalendarDays className="h-4 w-4 text-gray-400" />
            {today}
          </div>
        </div>
      </div>

      {/* 2. Key Performance Indicators */}
      <DashboardKPIs range={range} />

      {/* 3. Primary Actions Console */}
      <QuickActions />

      {/* 4. Core Analytics Grid (2/3 & 1/3 splits) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
        {/* Left Column: Sales Chart & Activity ledger */}
        <div className="lg:col-span-2 space-y-6">
          <DashboardCharts range={range} />
          <DashboardActivity />
        </div>

        {/* Right Column: Financial health status checks, balance & alerts */}
        <div className="lg:col-span-1">
          <DashboardAlerts />
        </div>
      </div>
    </div>
  );
}
