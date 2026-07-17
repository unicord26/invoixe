"use client";

import { useRef, useState } from "react";
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
  FileText,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { ImportWizard } from "../../components/import-wizard";
import { PageHeader } from "../../components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/* -------- small status banner -------- */
function StatusBanner({
  type,
  message,
}: {
  type: "success" | "error";
  message: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        type === "success"
          ? "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-300"
          : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
      )}
    >
      {type === "success" ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <p>{message}</p>
    </div>
  );
}

/* -------- drag-and-drop JSON drop zone -------- */
function JsonDropZone({
  busy,
  onFile,
}: {
  busy: boolean;
  onFile: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !busy && inputRef.current?.click()}
      className={cn(
        "group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-all",
        dragging
          ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/20"
          : "border-slate-200 bg-slate-50/40 hover:border-teal-400 hover:bg-teal-50/30 dark:border-slate-800 dark:bg-slate-900/20 dark:hover:border-teal-700"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        disabled={busy}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
      <div className={cn(
        "flex h-14 w-14 items-center justify-center rounded-full transition-colors",
        dragging ? "bg-teal-100 text-teal-600" : "bg-slate-100 text-slate-400 group-hover:bg-teal-100 group-hover:text-teal-600 dark:bg-slate-800"
      )}>
        <FileJson className="h-7 w-7" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {dragging ? "Drop to restore" : "Drop your backup file here"}
        </p>
        <p className="mt-1 text-xs text-slate-500">or click to browse — accepts <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">.json</code> backup files</p>
      </div>
      {busy && (
        <p className="text-xs text-teal-600 font-medium flex items-center gap-1.5">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Importing data…
        </p>
      )}
    </div>
  );
}

/* -------- main page -------- */
export default function BackupPage() {
  const [importResult, setImportResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [wizard, setWizard] = useState<"parties" | "items" | null>(null);
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const data = await api.get("/api/backup");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `invoixe-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      toast.success("Backup downloaded successfully!");
    } catch {
      toast.error("Failed to download backup. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const onJsonFile = async (file: File) => {
    setBusy(true);
    setImportResult(null);
    try {
      const parsed = JSON.parse(await file.text());
      const body = { parties: parsed.parties ?? [], items: parsed.items ?? [] };
      const r = await api.post<{ partiesImported: number; itemsImported: number; partiesSkipped: number; itemsSkipped: number }>(
        "/api/backup/import",
        body
      );
      setImportResult({
        type: "success",
        message: `Restored ${r.partiesImported} parties (${r.partiesSkipped} skipped) and ${r.itemsImported} items (${r.itemsSkipped} skipped) from the backup file.`,
      });
    } catch {
      setImportResult({
        type: "error",
        message: "Could not read that file. Make sure it's a valid Invoixe JSON backup with 'parties' and/or 'items' arrays.",
      });
    }
    setBusy(false);
  };

  return (
    <main className="mx-auto max-w-[1600px] px-4 sm:px-6 py-8">
      <PageHeader
        title="Backup & Import"
        description="Download a full data snapshot or restore your firm from a backup. Import parties and items from JSON or structured CSV files."
        backHref="/"
        backLabel="Dashboard"
      />

      {/* Top stat strip */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            icon: ShieldCheck,
            title: "Secure Snapshots",
            desc: "Full JSON backups include parties, items, transactions & bank data.",
            color: "text-teal-600 bg-teal-50 dark:bg-teal-950/20",
          },
          {
            icon: FileText,
            title: "CSV Column Mapping",
            desc: "Guided 3-step wizard maps your spreadsheet columns to Invoixe fields.",
            color: "text-violet-600 bg-violet-50 dark:bg-violet-950/20",
          },
          {
            icon: RefreshCw,
            title: "Safe Restore",
            desc: "Duplicates are detected and skipped automatically during any import.",
            color: "text-amber-600 bg-amber-50 dark:bg-amber-950/20",
          },
        ].map(({ icon: Icon, title, desc, color }) => (
          <div key={title} className="flex items-start gap-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm">
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", color)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{title}</p>
              <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── BACKUP ── */}
        <Card className="border-slate-150 dark:border-slate-800 shadow-sm">
          <CardHeader className="border-b border-slate-50 dark:border-slate-900 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/20 text-teal-600">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Export Backup</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Full firm snapshot as a portable JSON file
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="rounded-xl bg-slate-50/60 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">What&apos;s included</p>
              {[
                { icon: Users, label: "All parties (customers & suppliers)" },
                { icon: Package, label: "Item catalogue with pricing & stock" },
                { icon: FileText, label: "Transactions, invoices & purchases" },
                { icon: ShieldCheck, label: "Bank accounts, loans & cheques" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                  <Icon className="h-4 w-4 text-teal-500 shrink-0" />
                  {label}
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              The downloaded file can be used to restore this firm or seed a new one. Store it securely — it contains your full business data.
            </p>

            <Button
              onClick={download}
              disabled={downloading}
              className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg gap-2 shadow-sm"
            >
              {downloading ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Preparing Download…</>
              ) : (
                <><Download className="h-4 w-4" /> Download Backup (.json)</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* ── RESTORE from JSON ── */}
        <Card className="border-slate-150 dark:border-slate-800 shadow-sm">
          <CardHeader className="border-b border-slate-50 dark:border-slate-900 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-600">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Restore from Backup</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Upload a previous JSON backup to restore master data
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <JsonDropZone busy={busy} onFile={onJsonFile} />
            {importResult && (
              <StatusBanner type={importResult.type} message={importResult.message} />
            )}
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Only parties and items are restored from the JSON file. Transactions are not overwritten. Duplicate entries are safely skipped based on name matching.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── CSV IMPORT ── */}
      <Card className="mt-6 border-slate-150 dark:border-slate-800 shadow-sm">
        <CardHeader className="border-b border-slate-50 dark:border-slate-900 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/20 text-violet-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Import from Spreadsheet (CSV)</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Guided column-mapping wizard — ideal for migrating data from Excel, Tally, or other accounting software
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Parties CSV */}
            <button
              onClick={() => setWizard("parties")}
              className="group flex items-center justify-between gap-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 p-5 text-left transition-all hover:border-violet-300 hover:bg-violet-50/30 dark:hover:border-violet-800 dark:hover:bg-violet-950/10"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm group-hover:border-violet-200 group-hover:bg-violet-50 dark:group-hover:bg-violet-950/20 transition-colors">
                  <Users className="h-6 w-6 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Import Parties</p>
                  <p className="text-xs text-slate-500 mt-0.5">Customers, suppliers, and contacts from CSV</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {["Name", "Phone", "GSTIN", "Opening Balance", "Group"].map((f) => (
                      <span key={f} className="inline-block rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{f}</span>
                    ))}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 group-hover:text-violet-500 transition-colors" />
            </button>

            {/* Items CSV */}
            <button
              onClick={() => setWizard("items")}
              className="group flex items-center justify-between gap-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 p-5 text-left transition-all hover:border-teal-300 hover:bg-teal-50/30 dark:hover:border-teal-800 dark:hover:bg-teal-950/10"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm group-hover:border-teal-200 group-hover:bg-teal-50 dark:group-hover:bg-teal-950/20 transition-colors">
                  <Package className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Import Items</p>
                  <p className="text-xs text-slate-500 mt-0.5">Product catalogue with pricing and stock from CSV</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {["Name", "HSN/SAC", "Sale Price", "GST %", "Opening Stock"].map((f) => (
                      <span key={f} className="inline-block rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{f}</span>
                    ))}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 group-hover:text-teal-500 transition-colors" />
            </button>
          </div>

          {/* Wizard steps callout */}
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 px-4 py-3">
            {["Upload CSV", "Map Columns", "Preview & Import"].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                <div className="flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950/30 text-[10px] font-bold text-violet-700">{i + 1}</span>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{step}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {wizard && (
        <ImportWizard entity={wizard} open={!!wizard} onOpenChange={(o) => !o && setWizard(null)} />
      )}
    </main>
  );
}
