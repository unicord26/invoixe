"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Map,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { rupeesToPaise } from "@invoixe/core";
import { api } from "../lib/api";
import { parseCsv } from "../lib/csv";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Kind = "string" | "money" | "number";
export type FieldDef = { key: string; label: string; required?: boolean; kind?: Kind };

const PARTY_FIELDS: FieldDef[] = [
  { key: "name", label: "Name", required: true },
  { key: "type", label: "Type (customer/supplier/both)" },
  { key: "phone", label: "Phone" },
  { key: "gstin", label: "GSTIN" },
  { key: "groupName", label: "Group" },
  { key: "openingBalance", label: "Opening Balance (₹)", kind: "money" },
];
const ITEM_FIELDS: FieldDef[] = [
  { key: "name", label: "Name", required: true },
  { key: "type", label: "Type (product/service)" },
  { key: "hsnSac", label: "HSN/SAC" },
  { key: "unit", label: "Unit" },
  { key: "itemCode", label: "Item Code" },
  { key: "salePrice", label: "Sale Price (₹)", kind: "money" },
  { key: "purchasePrice", label: "Purchase Price (₹)", kind: "money" },
  { key: "taxRate", label: "GST %", kind: "number" },
  { key: "openingStock", label: "Opening Stock", kind: "number" },
];

const NONE = "__none__";

const STEPS = [
  { id: 1, label: "Upload", icon: Upload },
  { id: 2, label: "Map Columns", icon: Map },
  { id: 3, label: "Preview & Import", icon: Eye },
];

export function ImportWizard({
  entity,
  open,
  onOpenChange,
}: {
  entity: "parties" | "items";
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const fields = entity === "parties" ? PARTY_FIELDS : ITEM_FIELDS;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [map, setMap] = useState<Record<string, string>>({}); // fieldKey -> header
  const [fileName, setFileName] = useState<string>("");
  const [dragging, setDragging] = useState(false);

  const reset = () => {
    setStep(1);
    setHeaders([]);
    setRows([]);
    setMap({});
    setFileName("");
  };

  const processFile = (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    file.text().then((text) => {
      const parsed = parseCsv(text);
      if (parsed.length < 2) {
        toast.error("CSV needs a header row and at least one data row.");
        return;
      }
      const hdr = parsed[0]!.map((h) => h.trim());
      setHeaders(hdr);
      setRows(parsed.slice(1));
      const auto: Record<string, string> = {};
      for (const f of fields) {
        const hit = hdr.find(
          (h) =>
            h.toLowerCase() === f.key.toLowerCase() ||
            h.toLowerCase() === f.label.toLowerCase().split(" ")[0]
        );
        if (hit) auto[f.key] = hit;
      }
      setMap(auto);
      setStep(2);
    });
  };

  // Build normalized records from the column mapping.
  const records = useMemo(() => {
    const idx: Record<string, number> = {};
    headers.forEach((h, i) => (idx[h] = i));
    return rows.map((r) => {
      const obj: Record<string, unknown> = {};
      for (const f of fields) {
        const header = map[f.key];
        if (!header || header === NONE) continue;
        const raw = (r[idx[header]!] ?? "").trim();
        if (raw === "") continue;
        if (f.kind === "money") obj[f.key] = rupeesToPaise(Number(raw) || 0);
        else if (f.kind === "number") obj[f.key] = Number(raw) || 0;
        else if (f.key === "gstin") obj[f.key] = raw.toUpperCase();
        else obj[f.key] = raw;
      }
      return obj;
    });
  }, [rows, headers, map, fields]);

  const validCount = records.filter(
    (o) => typeof o.name === "string" && (o.name as string).length > 0
  ).length;

  const doImport = useMutation({
    mutationFn: () =>
      api.post<{ partiesImported: number; itemsImported: number; partiesSkipped: number; itemsSkipped: number }>(
        "/api/backup/import",
        entity === "parties" ? { parties: records } : { items: records }
      ),
    onSuccess: (res) => {
      const imported = entity === "parties" ? res.partiesImported : res.itemsImported;
      const skipped = entity === "parties" ? res.partiesSkipped : res.itemsSkipped;
      qc.invalidateQueries({ queryKey: [entity] });
      toast.success(`Imported ${imported} ${entity} (${skipped} skipped)`);
      onOpenChange(false);
      reset();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Import failed"),
  });

  const nameMapped = !!map["name"] && map["name"] !== NONE;
  const mappedFields = fields.filter((f) => map[f.key] && map[f.key] !== NONE);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Import {entity === "parties" ? "Parties" : "Items"} from CSV
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-1">
                {fileName
                  ? <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{fileName}</span>
                  : "Upload a spreadsheet and map its columns to Invoixe fields."}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-6 pt-5 pb-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex items-center gap-0 flex-1">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                      isDone
                        ? "border-teal-500 bg-teal-500 text-white"
                        : isActive
                        ? "border-teal-500 bg-white dark:bg-slate-950 text-teal-600"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-400"
                    )}
                  >
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-semibold whitespace-nowrap",
                      isActive || isDone ? "text-teal-600" : "text-slate-400"
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "mb-4 h-0.5 flex-1 mx-1 rounded transition-colors",
                      step > s.id ? "bg-teal-400" : "bg-slate-200 dark:bg-slate-800"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800" />

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="px-6 py-5 space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                processFile(e.dataTransfer.files[0]);
              }}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-all",
                dragging
                  ? "border-teal-500 bg-teal-50/50"
                  : "border-slate-200 bg-slate-50/40 hover:border-teal-400 hover:bg-teal-50/30 dark:border-slate-700 dark:bg-slate-900/20"
              )}
            >
              <div className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full transition-colors",
                dragging ? "bg-teal-100 text-teal-600" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-teal-100 group-hover:text-teal-600"
              )}>
                <Upload className="h-7 w-7" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {dragging ? "Release to upload" : "Drop your CSV file here"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  or click to browse — <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">.csv</code> files only
                </p>
                <p className="mt-2 text-[11px] text-slate-400">
                  First row must contain column headers
                </p>
              </div>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => processFile(e.target.files?.[0])}
            />
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 2 && (
          <div className="px-6 py-5 space-y-4">
            <p className="text-xs text-slate-500">
              Match your CSV column headers to Invoixe fields. Required fields are marked with{" "}
              <span className="text-red-500 font-bold">*</span>. Unmapped columns are skipped.
            </p>
            <div className="grid max-h-[45vh] gap-2 overflow-y-auto pr-1">
              {fields.map((f) => (
                <div
                  key={f.key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 px-3 py-2.5"
                >
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 min-w-0">
                    {f.label}
                    {f.required && <span className="ml-0.5 text-red-500">*</span>}
                  </Label>
                  <Select
                    value={map[f.key] ?? NONE}
                    onValueChange={(v) => setMap((m) => ({ ...m, [f.key]: v }))}
                  >
                    <SelectTrigger className="w-48 h-8 text-xs bg-white dark:bg-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— Skip this field —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-1">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!nameMapped}
                className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
              >
                Preview <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview & Import */}
        {step === 3 && (
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Showing up to 20 rows preview. Rows without a name are skipped.
              </p>
              <span className={cn(
                "rounded-full px-3 py-1 text-xs font-bold",
                validCount > 0
                  ? "bg-teal-100 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400"
                  : "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400"
              )}>
                {validCount} / {records.length} valid rows
              </span>
            </div>
            <div className="max-h-[40vh] overflow-auto rounded-xl border border-slate-100 dark:border-slate-800">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-slate-900/50">
                    {mappedFields.map((f) => (
                      <TableHead key={f.key} className="text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {f.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.slice(0, 20).map((rec, i) => (
                    <TableRow key={i} className={!rec.name ? "opacity-40" : ""}>
                      {mappedFields.map((f) => (
                        <TableCell key={f.key} className="text-xs py-2 max-w-[150px] truncate">
                          {String(rec[f.key] ?? "")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-between pt-1">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={() => doImport.mutate()}
                disabled={validCount === 0 || doImport.isPending}
                className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold"
              >
                <CheckCircle2 className="h-4 w-4" />
                {doImport.isPending ? "Importing…" : `Import ${validCount} Records`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
