"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Factory,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Activity,
} from "lucide-react";
import type { Item } from "@invoixe/types";
import { api } from "../../lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Bom = { id: string; itemId: string; lines: { rawItemId: string; qty: number }[] };


export default function ManufacturingPage() {
  const qc = useQueryClient();
  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ["items"],
    queryFn: () => api.get<(Item & { currentStock: number; categoryName?: string | null })[]>("/api/items"),
  });

  const [finishedId, setFinishedId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"bom" | "produce">("bom");
  const [rows, setRows] = useState<{ rawItemId: string; qtyInput: string; gramsInput: string }[]>([]);
  const [produceQty, setProduceQty] = useState("");

  const { data: bom, isLoading: bomLoading } = useQuery({
    queryKey: ["bom", finishedId],
    queryFn: () => api.get<Bom>(`/api/bom/${finishedId}`),
    enabled: !!finishedId,
  });

  useEffect(() => {
    if (bom) {
      setRows(bom.lines.map((l) => ({ rawItemId: l.rawItemId, qtyInput: "1", gramsInput: String(l.qty) })));
    } else {
      setRows([]);
    }
  }, [bom]);

  const saveBom = useMutation({
    mutationFn: () =>
      api.put(`/api/bom/${finishedId}`, {
        lines: rows
          .filter((r) => r.rawItemId && Number(r.qtyInput) > 0 && Number(r.gramsInput) > 0)
          .map((r) => ({
            rawItemId: r.rawItemId,
            qty: Number(r.qtyInput) * Number(r.gramsInput),
          })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bom", finishedId] });
    },
  });

  const produce = useMutation({
    mutationFn: () =>
      api.post("/api/production", {
        itemId: finishedId,
        qty: Number(produceQty),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      setProduceQty("");
    },
  });

  // Detect raw material items using the same heuristic as items/page.tsx:
  // category name contains "raw" OR item code starts with "RM-"
  const isRawMaterial = (i: typeof items extends (infer T)[] | undefined ? T : never) =>
    i.categoryName?.toLowerCase().includes("raw") || i.itemCode?.startsWith("RM-");

  // Products list (left panel): everything that is NOT a raw material
  const finishedProducts = (items ?? []).filter((i) => !isRawMaterial(i));

  // Raw materials source for the BOM dropdown: all items that ARE raw materials
  const rawMaterials = (items ?? []).filter((i) => isRawMaterial(i));

  // Search filter
  const filteredProducts = finishedProducts.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.itemCode && p.itemCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedProduct = items?.find((p) => p.id === finishedId);

  // Compute maximum buildable
  let maxBuildable: number | null = null;
  if (bom && bom.lines.length > 0) {
    let limit = Infinity;
    bom.lines.forEach((line) => {
      const rawItem = items?.find((it) => it.id === line.rawItemId);
      const rawStock = rawItem?.currentStock ?? 0;
      if (line.qty > 0) {
        const buildableLimit = Math.floor(rawStock / line.qty);
        if (buildableLimit < limit) {
          limit = buildableLimit;
        }
      }
    });
    if (limit !== Infinity) maxBuildable = limit;
  }

  // Compute requirements
  const buildQty = Number(produceQty) || 0;
  const requirements = bom?.lines.map((line) => {
    const rawItem = items?.find((it) => it.id === line.rawItemId);
    const needed = line.qty * buildQty;
    const available = rawItem?.currentStock ?? 0;
    const shortage = Math.max(0, needed - available);
    return {
      ...line,
      name: rawItem?.name ?? "Unknown Material",
      code: rawItem?.itemCode ?? "N/A",
      unit: "g",
      needed,
      available,
      shortage,
    };
  }) ?? [];

  const hasShortages = requirements.some((r) => r.shortage > 0);

  return (
    <main className="mx-auto max-w-[1600px] px-4 sm:px-6 py-6 sm:py-8">

      <div className="mb-8 border-b border-zinc-200 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            <Factory className="h-6 w-6 text-zinc-600" />
            Manufacturing Workspace
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Build recipes and record production runs with automatic raw material deductions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left Side: Product List */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border border-zinc-200 shadow-sm rounded-xl">
            <CardHeader className="p-4 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl">
              <CardTitle className="text-sm font-semibold text-zinc-700">Products List</CardTitle>
              <CardDescription className="text-xs">Select a product to manage recipe or produce</CardDescription>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search finished products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50/50 border border-zinc-200 rounded-lg placeholder-zinc-400 outline-none focus:bg-white focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100 transition"
                />
              </div>

              {/* Scrollable list */}
              <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
                {itemsLoading ? (
                  <div className="text-center py-8 text-xs text-zinc-400">Loading products...</div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-8 text-xs text-zinc-400">No products found.</div>
                ) : (
                  filteredProducts.map((p) => {
                    const isSelected = p.id === finishedId;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setFinishedId(p.id);
                          setProduceQty("");
                          setActiveTab("bom");
                        }}
                        className={cn(
                          "w-full text-left p-3 rounded-lg text-xs font-medium border transition-all flex items-center justify-between",
                          isSelected
                            ? "bg-[#133020] border-[#1b432c] text-white shadow-xs"
                            : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300"
                        )}
                      >
                        <div>
                          <div className="font-semibold truncate max-w-[180px]">{p.name}</div>
                          <div className={cn("text-[10px] mt-0.5", isSelected ? "text-zinc-200/70" : "text-zinc-500")}>
                            Code: {p.itemCode ?? "N/A"}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border",
                            isSelected
                              ? "bg-[#0a160f]/60 border-[#112419]/80 text-zinc-200"
                              : "bg-zinc-50 border-zinc-150 text-zinc-600"
                          )}>
                            Stock: {p.currentStock} {p.unit}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Active Workspace */}
        <div className="lg:col-span-8">
          {!finishedId ? (
            <Card className="border border-zinc-200 shadow-sm rounded-xl py-16 text-center bg-white">
              <CardContent className="flex flex-col items-center justify-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400">
                  <Factory className="h-8 w-8" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h3 className="text-sm font-bold text-zinc-800">Select a Finished Product</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Choose a product from the list on the left to configure its Bill of Materials recipe or log a production run.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-zinc-200 shadow-sm rounded-xl bg-white">
              <CardHeader className="p-6 border-b border-zinc-150">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-600 border border-zinc-200 px-2 py-0.5 rounded">
                      Product Selected
                    </span>
                    <h2 className="text-lg font-bold text-zinc-900 mt-2">{selectedProduct?.name}</h2>
                    <p className="text-xs text-zinc-500 mt-1">
                      Code: <span className="font-semibold text-zinc-700">{selectedProduct?.itemCode ?? "N/A"}</span> | Current Inventory: <span className="font-semibold text-zinc-700">{selectedProduct?.currentStock} {selectedProduct?.unit}</span>
                    </p>
                  </div>

                  {/* Tabs */}
                  <div className="flex border border-zinc-200 rounded-lg p-0.5 bg-zinc-50/50 shrink-0">
                    <button
                      onClick={() => setActiveTab("bom")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                        activeTab === "bom"
                          ? "bg-white text-zinc-900 shadow-xs border border-zinc-200/50"
                          : "text-zinc-500 hover:text-zinc-900"
                      )}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      Recipe (BOM)
                    </button>
                    <button
                      onClick={() => setActiveTab("produce")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                        activeTab === "produce"
                          ? "bg-white text-zinc-900 shadow-xs border border-zinc-200/50"
                          : "text-zinc-500 hover:text-zinc-900"
                      )}
                    >
                      <Activity className="h-3.5 w-3.5" />
                      Production Planning
                    </button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {activeTab === "bom" ? (
                  /* BOM CONFIG TAB */
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                        Recipe Raw Materials Required (per unit build)
                      </h3>
                    </div>

                    <div className="border border-zinc-100 rounded-lg overflow-hidden">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-150">
                            <th className="py-2.5 px-4 w-[50%]">Raw Material Item</th>
                            <th className="py-2.5 px-4 w-[20%]">Quantity</th>
                            <th className="py-2.5 px-4 w-[20%]">Grams (g)</th>
                            <th className="py-2.5 px-4 w-[10%] text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-8 px-4 text-center text-zinc-400 italic">
                                No raw materials added yet. Add materials below to configure the recipe.
                              </td>
                            </tr>
                          ) : (
                            rows.map((row, i) => (
                              <tr key={i} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition">
                                <td className="py-2.5 px-4">
                                  <select
                                    value={row.rawItemId}
                                    onChange={(e) => {
                                      setRows((p) =>
                                        p.map((x, idx) =>
                                          idx === i ? { ...x, rawItemId: e.target.value } : x
                                        )
                                      );
                                    }}
                                    className="w-full bg-white border border-zinc-200 rounded-md px-2 py-1.5 outline-none focus:border-zinc-300 text-xs"
                                  >
                                    <option value="">— select raw material —</option>
                                    {rawMaterials.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name} {p.itemCode ? `(${p.itemCode})` : ""}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="py-2.5 px-4">
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    placeholder="e.g. 1"
                                    value={row.qtyInput}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val.startsWith("-")) return;
                                      setRows((p) =>
                                        p.map((x, idx) => (idx === i ? { ...x, qtyInput: val } : x))
                                      );
                                    }}
                                    className="w-full bg-white border border-zinc-200 rounded-md px-2 py-1.5 outline-none focus:border-zinc-300 text-xs text-center"
                                  />
                                </td>
                                <td className="py-2.5 px-4">
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      step="any"
                                      min="0"
                                      placeholder="e.g. 0.055"
                                      value={row.gramsInput}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val.startsWith("-")) return;
                                        setRows((p) =>
                                          p.map((x, idx) => (idx === i ? { ...x, gramsInput: val } : x))
                                        );
                                      }}
                                      className="w-full bg-white border border-zinc-200 rounded-md px-2 py-1.5 outline-none focus:border-zinc-300 text-xs text-center"
                                    />
                                    <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded bg-zinc-100 border border-zinc-200 text-zinc-600 tracking-wide">
                                      g
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-4 text-right">
                                  <button
                                    onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))}
                                    className="text-zinc-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition"
                                    title="Delete Line"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-150 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setRows((p) => [...p, { rawItemId: "", qtyInput: "1", gramsInput: "" }])}
                        className="gap-1.5 text-zinc-700 border-zinc-200 hover:bg-zinc-50 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Material Row
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => saveBom.mutate()}
                        disabled={saveBom.isPending || rows.length === 0}
                        className="bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                      >
                        {saveBom.isPending ? "Saving..." : "Save Recipe"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* PRODUCE WORKSPACE TAB */
                  <div className="space-y-6">
                    {bomLoading ? (
                      <div className="text-center py-8 text-xs text-zinc-400">Loading recipe data...</div>
                    ) : !bom || bom.lines.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-zinc-500 bg-zinc-50/20">
                        <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                        <h4 className="font-semibold text-zinc-800 text-xs uppercase tracking-wide">No Recipe Defined</h4>
                        <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                          Please configure the Bill of Materials (BOM) recipe first before you can run production lines.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Stats Banner */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="rounded-xl border border-zinc-200/60 p-4 bg-zinc-50/50">
                            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              Maximum Buildable limit
                            </div>
                            <div className="text-lg font-bold text-zinc-800 mt-1">
                              {maxBuildable !== null ? `${maxBuildable} ${selectedProduct?.unit ?? "PCS"}` : "0"}
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">
                              Based on current raw materials in inventory.
                            </div>
                          </div>
                          <div className="rounded-xl border border-zinc-200/60 p-4 bg-zinc-50/50">
                            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              Available Product Stock
                            </div>
                            <div className="text-lg font-bold text-zinc-800 mt-1">
                              {selectedProduct?.currentStock} {selectedProduct?.unit}
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">
                              Calculated net inventory balance.
                            </div>
                          </div>
                        </div>

                        {/* Input Row */}
                        <div className="flex flex-col sm:flex-row sm:items-end gap-4 p-4 rounded-xl border border-zinc-200 bg-white">
                          <div className="space-y-1.5 flex-1 max-w-xs">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                              Quantity to Build
                            </label>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={produceQty}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val.startsWith("-")) return;
                                setProduceQty(val);
                              }}
                              placeholder="e.g. 10"
                              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 outline-none focus:border-zinc-300 text-xs"
                            />
                          </div>

                          <Button
                            type="button"
                            onClick={() => produce.mutate()}
                            disabled={produce.isPending || !(Number(produceQty) > 0) || hasShortages}
                            className="bg-green-600 hover:bg-green-700 text-white rounded px-6 py-2 text-xs font-semibold shrink-0 disabled:opacity-50"
                          >
                            {produce.isPending ? "Building..." : "Confirm Production Run"}
                          </Button>
                        </div>

                        {/* Warnings */}
                        {produce.error && (
                          <div className="p-3 bg-red-50 border border-red-150 rounded-lg text-xs text-red-600">
                            Error: {String(produce.error.message)}
                          </div>
                        )}
                        {produce.isSuccess && (
                          <div className="p-3 bg-green-50 border border-green-150 rounded-lg text-xs text-green-700 flex items-center gap-1.5 font-medium">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            Production run completed successfully! Raw materials deducted, stock added.
                          </div>
                        )}

                        {/* Materials Requirements table */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                            Production Materials Requirement Calculations
                          </h4>
                          <div className="border border-zinc-150 rounded-lg overflow-hidden">
                            <table className="w-full border-collapse text-left text-xs">
                              <thead>
                                <tr className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-150">
                                  <th className="py-2.5 px-4 w-[40%]">Material Name</th>
                                  <th className="py-2.5 px-4 w-[20%] text-right">Available Stock</th>
                                  <th className="py-2.5 px-4 w-[20%] text-right">Required Quantity</th>
                                  <th className="py-2.5 px-4 w-[20%] text-right">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {requirements.map((r, i) => {
                                  const isShortage = r.shortage > 0;
                                  return (
                                    <tr key={i} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition">
                                      <td className="py-2.5 px-4">
                                        <div className="font-semibold text-zinc-800">{r.name}</div>
                                        <div className="text-[10px] text-zinc-400">Code: {r.code}</div>
                                      </td>
                                      <td className="py-2.5 px-4 text-right font-medium text-zinc-600">
                                        {r.available} {r.unit}
                                      </td>
                                      <td className="py-2.5 px-4 text-right font-medium text-zinc-800">
                                        {r.needed} {r.unit}
                                      </td>
                                      <td className="py-2.5 px-4 text-right">
                                        {isShortage ? (
                                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-150 text-[10px] font-bold">
                                            Shortage: {r.shortage} {r.unit}
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-150 text-[10px] font-bold">
                                            Available ✓
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
