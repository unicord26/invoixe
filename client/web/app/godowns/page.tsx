"use client";

import Link from "next/link";
import { Lock, Warehouse, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function GodownsPage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-20 flex flex-col items-center justify-center min-h-[80vh] text-center">
      <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-50 border border-zinc-100 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
        <Warehouse className="h-10 w-10 text-zinc-400 dark:text-zinc-500" />
        <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md border-2 border-white dark:border-zinc-950">
          <Lock className="h-3.5 w-3.5" />
        </span>
      </div>

      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
        Godowns &amp; Warehousing
      </h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400 max-w-sm">
        Track stock movements across multiple storage godowns, manage stock transfers, and check inventory levels per warehouse.
      </p>

      <Card className="mt-8 border border-zinc-100 bg-white/70 shadow-xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/70 max-w-sm w-full">
        <CardContent className="p-6 space-y-4">
          <div className="rounded-2xl bg-amber-50 border border-amber-100/50 p-4 dark:bg-amber-950/10 dark:border-amber-900/30 flex items-start gap-3 text-left">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-500 text-white text-[10px] font-bold">
              !
            </span>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                Coming Soon
              </h4>
              <p className="text-xs text-amber-700/85 dark:text-amber-500/90 leading-relaxed">
                This feature is locked for this workspace version. Multi-warehouse tracking is planned in the next system updates.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Link href="/">
              <Button className="w-full gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
