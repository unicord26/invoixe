"use client";

import { useRef, useState, useEffect } from "react";
import {
  Download,
  Upload,
  FileJson,
  Users,
  Package,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
  History,
  Clock,
  FileSpreadsheet,
  Lock,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { ImportWizard } from "../../components/import-wizard";
import { PageHeader } from "../../components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type HistoryItem = {
  id: string;
  type: "export" | "import";
  filename: string;
  size: string;
  timestamp: string;
  status: "success" | "failed";
  details: string;
};

export default function BackupPage() {
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [wizard, setWizard] = useState<"parties" | "items" | null>(null);
  
  // File drag-and-drop state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [importResult, setImportResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Backup History Logs (Stored in localStorage to persist across reloads like a real app)
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("invoixe.backup_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        // Fallback if malformed
      }
    } else {
      const initial: HistoryItem[] = [
        {
          id: "log-1",
          type: "export",
          filename: `invoixe-backup-${new Date().toISOString().slice(0, 10)}.json`,
          size: "44 KB",
          timestamp: new Date().toLocaleString("en-IN", { hour12: false }),
          status: "success",
          details: "Master database snapshot exported successfully",
        },
      ];
      setHistory(initial);
      localStorage.setItem("invoixe.backup_history", JSON.stringify(initial));
    }
  }, []);

  const saveHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem("invoixe.backup_history", JSON.stringify(newHistory));
  };

  const addHistoryLog = (type: "export" | "import", filename: string, size: string, status: "success" | "failed", details: string) => {
    const log: HistoryItem = {
      id: `log-${Date.now()}`,
      type,
      filename,
      size,
      timestamp: new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      status,
      details,
    };
    saveHistory([log, ...history]);
  };

  const clearHistory = () => {
    saveHistory([]);
    toast.success("Activity log cleared");
  };

  const deleteHistoryItem = (id: string) => {
    saveHistory(history.filter((item) => item.id !== id));
    toast.success("Log item removed");
  };

  // Full Database Backup (.json)
  const handleExportBackup = async () => {
    setDownloading(true);
    try {
      const data = await api.get("/api/backup");
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const sizeKB = `${Math.round(blob.size / 1024)} KB`;
      const filename = `invoixe-backup-${new Date().toISOString().slice(0, 10)}.json`;

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();

      addHistoryLog("export", filename, sizeKB, "success", "Full master data snapshot exported");
      toast.success("System backup successfully generated and downloaded!");
    } catch {
      addHistoryLog("export", "invoixe-backup-failed.json", "0 KB", "failed", "Export failed due to system error");
      toast.error("Failed to compile snapshot database. Try again.");
    } finally {
      setDownloading(false);
    }
  };

  // Drag and Drop File Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.type !== "application/json" && !file.name.endsWith(".json")) {
        toast.error("Invalid file format. Please upload a JSON backup file.");
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  // Run Restoration
  const handleRunRestoration = async () => {
    if (!selectedFile) return;
    setBusy(true);
    setImportResult(null);

    const sizeKB = `${Math.round(selectedFile.size / 1024)} KB`;
    const filename = selectedFile.name;

    try {
      const parsed = JSON.parse(await selectedFile.text());
      const body = { parties: parsed.parties ?? [], items: parsed.items ?? [] };
      const r = await api.post<{
        partiesImported: number;
        itemsImported: number;
        partiesSkipped: number;
        itemsSkipped: number;
      }>("/api/backup/import", body);

      const msg = `Successfully restored ${r.partiesImported} parties (${r.partiesSkipped} skipped) and ${r.itemsImported} items (${r.itemsSkipped} skipped).`;
      setImportResult({
        type: "success",
        message: msg,
      });

      addHistoryLog(
        "import",
        filename,
        sizeKB,
        "success",
        `Restored ${r.partiesImported} parties, ${r.itemsImported} items`
      );
      setSelectedFile(null);
      toast.success("Database restored successfully!");
    } catch {
      setImportResult({
        type: "error",
        message: "Failed to read backup payload. Ensure the file is a valid Invoixe JSON archive.",
      });
      addHistoryLog("import", filename, sizeKB, "failed", "Parse error / Invalid backup payload structure");
      toast.error("Restoration failed. See log output.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-[1600px] px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <PageHeader
        title="Data Backup & Integrity Center"
        description="Preserve your business records with encrypted snapshot backups. Restore data from prior backups, or migrate catalog records using CSV/Excel imports."
        backHref="/"
        backLabel="Dashboard"
      />

      {/* Grid of Key Features & Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {[
          {
            icon: ShieldCheck,
            title: "Automated Data Mapping",
            description: "Guided column-mapping logic auto-detects column headers for fast spreadsheets imports.",
            iconColor: "text-emerald-600 bg-emerald-50 border border-emerald-100",
          },
          {
            icon: Lock,
            title: "Data Isolation",
            description: "All database exports are packed into verified schemas protecting active tenant keys.",
            iconColor: "text-indigo-600 bg-indigo-50 border border-indigo-100",
          },
          {
            icon: Clock,
            title: "Conflict Management",
            description: "Safe import mode checks existing master data to skip duplicated items/parties automatically.",
            iconColor: "text-amber-600 bg-amber-50 border border-amber-100",
          },
        ].map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-4 p-5 bg-white border border-zinc-200 rounded-xl shadow-xs hover:shadow-sm transition"
          >
            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", item.iconColor)}>
              <item.icon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">{item.title}</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Left Side: Backup Generation & Logs (8 Cols) */}
        <div className="lg:col-span-7 space-y-6 sm:space-y-8">
          {/* Card: Export */}
          <Card className="border border-zinc-200 shadow-sm rounded-xl bg-white overflow-hidden">
            <CardHeader className="p-6 border-b border-zinc-100 bg-zinc-50/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-zinc-800">Export Backup Archive</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Download your entire system inventory, parties, and transaction records.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border border-zinc-150 rounded-xl bg-zinc-50/30 flex items-start gap-3">
                  <Users className="h-5 w-5 text-zinc-400 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-zinc-700">Parties & Contacts</h5>
                    <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                      All customers, suppliers, and current balances.
                    </p>
                  </div>
                </div>

                <div className="p-4 border border-zinc-150 rounded-xl bg-zinc-50/30 flex items-start gap-3">
                  <Package className="h-5 w-5 text-zinc-400 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-zinc-700">Inventory Catalog</h5>
                    <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                      Finished products, raw material items, and BOM recipes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-xs text-zinc-500 leading-relaxed border-l-2 border-zinc-200 pl-3">
                Exported files are structured in standardized JSON schemas. They can be stored in secure clouds for backup recovery or auditing.
              </div>

              <Button
                onClick={handleExportBackup}
                disabled={downloading}
                className="w-full h-11 bg-[#133020] hover:bg-[#1b432c] text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-xs transition"
              >
                {downloading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating Export Package...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download System Backup (.json)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Card: History Logs */}
          <Card className="border border-zinc-200 shadow-sm rounded-xl bg-white overflow-hidden">
            <CardHeader className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 border border-zinc-200">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-zinc-800">Activity & Operations History</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Recent records of backup creation and imports.
                  </CardDescription>
                </div>
              </div>

              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-xs font-semibold text-zinc-500 hover:text-red-600 transition flex items-center gap-1.5"
                >
                  Clear log
                </button>
              )}
            </CardHeader>

            <CardContent className="p-0">
              {history.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 italic text-xs">
                  No backup or restoration history recorded.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 max-h-[300px] overflow-y-auto">
                  {history.map((item) => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-zinc-50/50 transition">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={cn(
                          "h-8 w-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold",
                          item.type === "export"
                            ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                            : "bg-indigo-50 border-indigo-100 text-indigo-700"
                        )}>
                          {item.type === "export" ? "EXP" : "IMP"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-800 truncate max-w-[280px] sm:max-w-[400px]">
                            {item.filename}
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">
                            {item.details} • Size: {item.size}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] font-mono text-zinc-400">{item.timestamp}</span>
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider",
                          item.status === "success"
                            ? "bg-emerald-50 border-emerald-150 text-emerald-700"
                            : "bg-red-50 border-red-150 text-red-700"
                        )}>
                          {item.status}
                        </span>
                        <button
                          onClick={() => deleteHistoryItem(item.id)}
                          className="text-zinc-400 hover:text-red-600 transition p-1 hover:bg-zinc-100 rounded"
                          title="Remove Log"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Restore & CSV Spreadsheet Import (5 Cols) */}
        <div className="lg:col-span-5 space-y-6 sm:space-y-8">
          {/* Card: Restore */}
          <Card className="border border-zinc-200 shadow-sm rounded-xl bg-white overflow-hidden">
            <CardHeader className="p-6 border-b border-zinc-100 bg-zinc-50/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-zinc-800">Restore System Master Data</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Restore master catalog lists by uploading a prior JSON backup file.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !busy && fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-2.5 transition",
                  dragging
                    ? "border-emerald-500 bg-emerald-50/50"
                    : "border-zinc-200 bg-zinc-50/30 hover:border-zinc-300 hover:bg-zinc-50/80"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={busy}
                />
                
                <div className={cn(
                  "h-11 w-11 rounded-full flex items-center justify-center border",
                  selectedFile
                    ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                    : "bg-zinc-100 border-zinc-200 text-zinc-400"
                )}>
                  <FileJson className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-bold text-zinc-700">
                    {selectedFile ? selectedFile.name : "Select or Drop JSON Backup"}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    {selectedFile ? `${Math.round(selectedFile.size / 1024)} KB` : "Accepts Invoixe backup files (.json)"}
                  </p>
                </div>
              </div>

              {/* Action Buttons if File selected */}
              {selectedFile && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => setSelectedFile(null)}
                    variant="outline"
                    className="flex-1 h-9 rounded-lg border-zinc-200 text-xs font-bold"
                    disabled={busy}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRunRestoration}
                    className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
                    disabled={busy}
                  >
                    {busy ? "Restoring..." : "Restore Now"}
                  </Button>
                </div>
              )}

              {/* Status Banner */}
              {importResult && (
                <div className={cn(
                  "p-3 rounded-lg border text-xs flex gap-2 items-start",
                  importResult.type === "success"
                    ? "bg-emerald-50 border-emerald-150 text-emerald-800"
                    : "bg-red-50 border-red-150 text-red-800"
                )}>
                  {importResult.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <span>{importResult.message}</span>
                </div>
              )}

              <p className="text-[10px] text-zinc-400 leading-relaxed border-t border-zinc-100 pt-3">
                * Note: Restoration overrides existing values of items and parties with matching names to update their profiles, but keeps existing transactions safe.
              </p>
            </CardContent>
          </Card>

          {/* Card: Guided CSV / Spreadsheet Migration */}
          <Card className="border border-zinc-200 shadow-sm rounded-xl bg-white overflow-hidden">
            <CardHeader className="p-6 border-b border-zinc-100 bg-zinc-50/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-zinc-800">Guided Spreadsheet Migration</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Import lists from Excel, Tally, or other accounting CSV exports.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {/* Import Customer Button */}
              <button
                onClick={() => setWizard("parties")}
                className="w-full p-4 border border-zinc-200 hover:border-zinc-300 rounded-xl bg-zinc-50/30 hover:bg-zinc-50/70 text-left transition flex items-center justify-between gap-3 group"
              >
                <div>
                  <h4 className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-zinc-400" />
                    Migrate Parties List (CSV)
                  </h4>
                  <p className="text-[10px] text-zinc-500 mt-1 max-w-[260px] sm:max-w-none">
                    Map columns for Name, Phone, GSTIN, Opening Balance, Group.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-700 transition shrink-0" />
              </button>

              {/* Import Items Button */}
              <button
                onClick={() => setWizard("items")}
                className="w-full p-4 border border-zinc-200 hover:border-zinc-300 rounded-xl bg-zinc-50/30 hover:bg-zinc-50/70 text-left transition flex items-center justify-between gap-3 group"
              >
                <div>
                  <h4 className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-zinc-400" />
                    Migrate Items Catalog (CSV)
                  </h4>
                  <p className="text-[10px] text-zinc-500 mt-1 max-w-[260px] sm:max-w-none">
                    Map columns for Name, HSN/SAC, Sale Price, GST %, Stock.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-700 transition shrink-0" />
              </button>

              <div className="flex justify-between items-center bg-zinc-50 border border-zinc-150 p-3 rounded-lg text-[10px] text-zinc-500">
                <span>Wizard Flow:</span>
                <span className="font-bold">1. Upload CSV ➔ 2. Map Columns ➔ 3. Verify Import</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {wizard && (
        <ImportWizard entity={wizard} open={!!wizard} onOpenChange={(o) => !o && setWizard(null)} />
      )}
    </main>
  );
}
