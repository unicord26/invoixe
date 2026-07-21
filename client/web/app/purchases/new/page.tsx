"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { computeInvoice, formatINR, rupeesToPaise } from "@invoixe/core";
import { GST_RATES, type Item, type Party } from "@invoixe/types";
import { api } from "../../../lib/api";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  Trash2,
  PackageSearch,
  ChevronDown,
  Receipt,
  AlertCircle,
} from "lucide-react";

type Business = { stateCode: string | null };
type Line = {
  itemId: string | null;
  description: string;
  hsnSac: string;
  qty: string;
  rateRupees: string;
  taxRate: number;
};

const blankLine: Line = {
  itemId: null,
  description: "",
  hsnSac: "",
  qty: "1",
  rateRupees: "",
  taxRate: 18,
};

export default function NewPurchasePage() {
  const router = useRouter();

  const { data: parties } = useQuery<Party[]>({
    queryKey: ["parties"],
    queryFn: () => api.get<Party[]>("/api/parties"),
  });
  const { data: items } = useQuery<Item[]>({
    queryKey: ["items"],
    queryFn: () => api.get<Item[]>("/api/items"),
  });
  const { data: business } = useQuery<Business>({
    queryKey: ["business"],
    queryFn: () => api.get<Business>("/api/business/current"),
  });

  const [partyId, setPartyId] = useState("");
  const [refNo, setRefNo] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ ...blankLine }]);

  const suppliers = parties?.filter((p) => p.type === "supplier" || p.type === "both") ?? [];
  const party = parties?.find((p) => p.id === partyId) ?? null;
  const ourState = business?.stateCode ?? "27";
  const supplierState = party?.stateCode ?? ourState;

  const computed = useMemo(() => {
    const el = lines
      .filter((l) => Number(l.qty) > 0 && l.rateRupees !== "")
      .map((l) => ({
        qty: Number(l.qty),
        rate: rupeesToPaise(Number(l.rateRupees)),
        taxRate: l.taxRate,
        hsnSac: l.hsnSac || undefined,
      }));
    return el.length
      ? computeInvoice({ sellerStateCode: supplierState, buyerStateCode: ourState, lines: el })
      : null;
  }, [lines, supplierState, ourState]);

  const save = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>("/api/purchases", {
        partyId: partyId || null,
        referenceNo: refNo || null,
        date: date ? new Date(date) : new Date(),
        notes: notes.trim() || null,
        lines: lines
          .filter(
            (l) => Number(l.qty) > 0 && l.rateRupees !== "" && l.description.trim()
          )
          .map((l) => ({
            itemId: l.itemId,
            description: l.description.trim(),
            hsnSac: l.hsnSac || null,
            qty: Number(l.qty),
            rate: rupeesToPaise(Number(l.rateRupees)),
            taxRate: l.taxRate,
          })),
      }),
    onSuccess: () => {
      toast.success("Purchase bill saved and stock updated!");
      router.push("/purchases");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to save purchase bill");
    },
  });

  const updateLine = (i: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const pickItem = (i: number, id: string) => {
    const it = items?.find((x) => x.id === id);
    if (!it) return updateLine(i, { itemId: null });
    updateLine(i, {
      itemId: it.id,
      description: it.name,
      hsnSac: it.hsnSac ?? "",
      rateRupees: (it.purchasePrice / 100 || it.salePrice / 100).toString(),
      taxRate: it.taxRate,
    });
  };

  const removeLine = (i: number) =>
    setLines((prev) => prev.filter((_, idx) => idx !== i));

  const canSave =
    lines.some(
      (l) => Number(l.qty) > 0 && l.rateRupees !== "" && l.description.trim()
    ) && !save.isPending;

  const inputStyle =
    "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-zinc-800 dark:bg-zinc-950 dark:text-white";

  const isInterState = supplierState !== ourState;

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-gray-100 pb-5 sm:flex-row sm:items-start sm:justify-between dark:border-zinc-800">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/purchases">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 -ml-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              New Purchase Bill
            </h1>
          </div>
          <p className="ml-11 text-xs text-zinc-500">
            Record a supplier purchase to track Input GST credit and update inventory stock.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => save.mutate()}
            disabled={!canSave}
            className="h-9 gap-2 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm hover:bg-primary/95"
          >
            <Receipt className="h-4 w-4" />
            {save.isPending ? "Saving Bill..." : "Save Purchase Bill"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left — Bill Details */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl shadow-sm overflow-hidden">
            <div className="border-b border-zinc-100 dark:border-zinc-850 px-5 py-4 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/10">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                Bill Details
              </h3>
            </div>
            <CardContent className="p-5 space-y-4">
              {/* Supplier */}
              <div>
                <label className="mb-1 block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Supplier Party
                </label>
                <div className="relative">
                  <select
                    value={partyId}
                    onChange={(e) => setPartyId(e.target.value)}
                    className={cn(inputStyle, "pr-8 appearance-none")}
                  >
                    <option value="">— Select Supplier —</option>
                    {suppliers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                </div>
                {party && (
                  <div className="mt-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 px-3.5 py-2.5 border border-zinc-100 dark:border-zinc-800">
                    <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      {party.name}
                    </p>
                    {party.gstin && (
                      <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                        GSTIN: {party.gstin}
                      </p>
                    )}
                    {party.stateCode && (
                      <p className={cn(
                        "text-[10px] font-bold mt-1",
                        isInterState ? "text-orange-600 dark:text-orange-400" : "text-teal-600 dark:text-teal-400"
                      )}>
                        {isInterState ? "⚡ Interstate — IGST applies" : "✓ Intrastate — CGST + SGST"}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Ref No */}
              <div>
                <label className="mb-1 block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Supplier Bill Reference No
                </label>
                <input
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  placeholder="e.g. INV/2024-25/1438"
                  className={inputStyle}
                />
              </div>

              {/* Date */}
              <div>
                <label className="mb-1 block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Bill Date
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
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any internal notes for this purchase bill..."
                  rows={2}
                  className={cn(inputStyle, "resize-none")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary Card */}
          {computed && (
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl shadow-sm overflow-hidden">
              <div className="border-b border-zinc-100 dark:border-zinc-850 px-5 py-4 bg-zinc-50/50 dark:bg-zinc-900/10">
                <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                  Bill Summary
                </h3>
              </div>
              <CardContent className="p-5">
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between text-zinc-500">
                    <span>Taxable Amount</span>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">
                      {formatINR(computed.totals.subTotal)}
                    </span>
                  </div>
                  {isInterState ? (
                    <div className="flex justify-between text-zinc-500">
                      <span>IGST</span>
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">
                        {formatINR(computed.totals.igst)}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-zinc-500">
                        <span>CGST</span>
                        <span className="font-bold text-zinc-700 dark:text-zinc-300">
                          {formatINR(computed.totals.cgst)}
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-500">
                        <span>SGST</span>
                        <span className="font-bold text-zinc-700 dark:text-zinc-300">
                          {formatINR(computed.totals.sgst)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2.5 flex justify-between">
                    <span className="font-extrabold text-zinc-900 dark:text-white text-base">
                      Grand Total
                    </span>
                    <span className="font-black text-red-600 dark:text-red-400 text-base tracking-tight">
                      {formatINR(computed.totals.grandTotal)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {save.error && (
            <div className="flex gap-2 items-start rounded-xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 px-4 py-3 text-xs font-semibold text-red-700 dark:text-red-400">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {save.error instanceof Error ? save.error.message : "An error occurred"}
            </div>
          )}
        </div>

        {/* Right — Line Items */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl shadow-sm overflow-hidden">
            <div className="border-b border-zinc-100 dark:border-zinc-850 px-5 py-4 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/10">
              <div>
                <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                  Line Items
                </h3>
                <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                  {lines.length} item{lines.length !== 1 ? "s" : ""} added
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setLines((prev) => [...prev, { ...blankLine }])}
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-xl border-zinc-200 text-zinc-600 text-xs font-bold dark:border-zinc-800 dark:text-zinc-400"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Line
              </Button>
            </div>
            <CardContent className="p-0">
              <div className="divide-y divide-zinc-100 dark:divide-zinc-850">
                {lines.map((line, i) => (
                  <div key={i} className="px-5 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
                        Line {i + 1}
                      </span>
                      {lines.length > 1 && (
                        <button
                          onClick={() => removeLine(i)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Item picker */}
                    {items && items.length > 0 && (
                      <div>
                        <label className="mb-1 block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          Pick Item from Inventory
                        </label>
                        <div className="relative">
                          <PackageSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                          <select
                            value={line.itemId ?? ""}
                            onChange={(e) => pickItem(i, e.target.value)}
                            className={cn(inputStyle, "pl-9")}
                          >
                            <option value="">— Pick from inventory (optional) —</option>
                            {items.map((it) => (
                              <option key={it.id} value={it.id}>
                                {it.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Item / Description <span className="text-red-400">*</span>
                      </label>
                      <input
                        value={line.description}
                        onChange={(e) => updateLine(i, { description: e.target.value })}
                        placeholder="Product or service description"
                        className={inputStyle}
                      />
                    </div>

                    {/* HSN / Qty / Rate / GST in a row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="mb-1 block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          HSN / SAC
                        </label>
                        <input
                          value={line.hsnSac}
                          onChange={(e) => updateLine(i, { hsnSac: e.target.value })}
                          placeholder="1234"
                          className={inputStyle}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          Quantity
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={line.qty}
                          onChange={(e) => updateLine(i, { qty: e.target.value })}
                          className={inputStyle}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          Rate (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-bold">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            value={line.rateRupees}
                            onChange={(e) => updateLine(i, { rateRupees: e.target.value })}
                            placeholder="0.00"
                            className={cn(inputStyle, "pl-7")}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          GST Rate
                        </label>
                        <select
                          value={line.taxRate}
                          onChange={(e) => updateLine(i, { taxRate: Number(e.target.value) })}
                          className={inputStyle}
                        >
                          {GST_RATES.map((r) => (
                            <option key={r} value={r}>
                              {r}%
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Line total preview */}
                    {Number(line.qty) > 0 && line.rateRupees && (
                      <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/50 px-3.5 py-2 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                        <span className="text-zinc-400 font-semibold">Line subtotal</span>
                        <span className="font-black text-zinc-800 dark:text-zinc-200">
                          {formatINR(Number(line.qty) * rupeesToPaise(Number(line.rateRupees)))}
                          <span className="font-semibold text-zinc-400 ml-1.5">
                            + {line.taxRate}% GST
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add line button at the bottom */}
              <div className="px-5 pb-4">
                <button
                  type="button"
                  onClick={() => setLines((prev) => [...prev, { ...blankLine }])}
                  className="w-full rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 py-2.5 text-xs font-bold text-zinc-500 hover:border-primary hover:text-primary dark:hover:border-primary transition"
                >
                  + Add Another Line Item
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Action bar */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-5 py-4 shadow-xs">
            <Link href="/purchases">
              <Button variant="outline" className="h-9 gap-2 rounded-xl text-zinc-500 border-zinc-200 dark:border-zinc-800 text-sm font-bold">
                <ArrowLeft className="h-4 w-4" />
                Cancel
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              {computed && (
                <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200">
                  Grand Total:{" "}
                  <span className="text-red-600 dark:text-red-400">
                    {formatINR(computed.totals.grandTotal)}
                  </span>
                </span>
              )}
              <Button
                onClick={() => save.mutate()}
                disabled={!canSave}
                className="h-9 gap-2 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm hover:bg-primary/95"
              >
                <Receipt className="h-4 w-4" />
                {save.isPending ? "Saving..." : "Save Purchase Bill"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
