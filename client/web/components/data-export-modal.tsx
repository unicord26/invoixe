"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  Lock,
  X,
  FileDown,
  Database,
  Info,
} from "lucide-react";
import {
  exportToCsv,
  exportToExcel,
} from "../lib/export-utils";
import { cn } from "@/lib/utils";

type ExportFormat = "csv" | "xlsx";

type DataExportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  filenamePrefix: string;
  rows: string[][];
};

export function DataExportModal({
  open,
  onOpenChange,
  title,
  filenamePrefix,
  rows,
}: DataExportModalProps) {
  const [fmt, setFmt] = useState<ExportFormat>("csv");
  const [downloading, setDownloading] = useState(false);

  // Esc key listener to close modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    if (open) {
      window.addEventListener("keydown", onKey);
    }
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const headers = useMemo(() => rows[0] ?? [], [rows]);
  const dataRows = useMemo(() => rows.slice(1), [rows]);

  // Excel column letters helper (A, B, C, D...)
  const getColLetter = (index: number) => {
    let letter = "";
    let tempIdx = index;
    while (tempIdx >= 0) {
      letter = String.fromCharCode((tempIdx % 26) + 65) + letter;
      tempIdx = Math.floor(tempIdx / 26) - 1;
    }
    return letter;
  };

  const handleCellDoubleClick = () => {
    toast.error("Preview is read-only. Download the file to edit.", {
      id: "readonly-warn",
      icon: "🔒",
    });
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const filename = `${filenamePrefix}.${fmt}`;
      if (fmt === "xlsx") {
        exportToExcel(rows, filename, title);
      } else {
        exportToCsv(rows, filename);
      }
      toast.success(`Downloaded ${fmt === "csv" ? "CSV" : "Excel"} file successfully!`);
      onOpenChange(false);
    } catch {
      toast.error("Download failed — please try again");
    } finally {
      setDownloading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-[900px] max-w-[96vw] max-h-[85vh] rounded-[20px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="flex items-center gap-3.5">
            <div className="w-[38px] h-[38px] rounded-[10px] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-800/50">
              <Database size={18} />
            </div>
            <div>
              <h3 className="text-[15px] font-extrabold text-zinc-900 dark:text-zinc-100 leading-tight">
                {title}
              </h3>
              <p className="text-[12px] text-zinc-500 font-medium mt-0.5">
                Previewing first {dataRows.length} of {dataRows.length} total rows
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 flex items-center justify-center transition-all duration-200 hover:rotate-90"
          >
            <X size={15} />
          </button>
        </div>

        {/* Lock Banner indicating read-only nature */}
        <div className="flex items-center gap-2 bg-[#FFFBEB] dark:bg-amber-950/30 border-b border-[#FDE68A] dark:border-amber-900/40 text-[#B45309] dark:text-amber-300 text-[11px] px-6 py-2 font-medium">
          <Lock size={12} className="shrink-0" />
          <span>
            <strong>Non-Editable Preview.</strong> Double-click any cell or choose formatting to preview before download.
          </span>
        </div>

        {/* Live preview grid mock spreadsheet */}
        <div className="flex-1 min-h-[260px] bg-[#FAF9F6] dark:bg-zinc-950 flex overflow-hidden relative">
          {dataRows.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 text-xs p-10 gap-3 font-medium">
              <Info size={24} className="text-zinc-400" />
              <span>No matching records found to export.</span>
            </div>
          ) : (
            <div className="flex-1 overflow-auto relative">
              <table className={cn("w-full border-collapse text-xs bg-white dark:bg-zinc-950", `format-${fmt}`)}>
                <thead>
                  {/* Excel Col Letters Row (A, B, C...) */}
                  <tr className="excel-cols-row">
                    <th className="sticky top-0 left-0 z-30 bg-[#E6E4DD] dark:bg-zinc-900 w-[45px] min-w-[45px] border-b border-r border-[#E6E4DD] dark:border-zinc-800"></th>
                    {headers.map((_, i) => (
                      <th
                        key={i}
                        className="sticky top-0 z-20 bg-[#F3F2EE] dark:bg-zinc-900 text-zinc-500 font-medium text-[10px] text-center px-2.5 py-1 border-b border-r border-[#E6E4DD] dark:border-zinc-800 min-w-[110px] select-none font-mono"
                      >
                        {getColLetter(i)}
                      </th>
                    ))}
                  </tr>

                  {/* Database Headers Row */}
                  <tr className="db-headers-row">
                    <th className="sticky top-[23px] left-0 z-25 bg-[#F3F2EE] dark:bg-zinc-900 text-center border-b-2 border-r border-[#E6E4DD] dark:border-zinc-800 px-2 py-2">
                      <Lock size={10} className="opacity-60 inline" />
                    </th>
                    {headers.map((h) => (
                      <th
                        key={h}
                        className={cn(
                          "sticky top-[23px] z-20 px-3 py-2 text-left font-semibold text-xs whitespace-nowrap transition-colors duration-200 border-r border-b-2 border-[#E6E4DD] dark:border-zinc-800 select-none",
                          fmt === "csv"
                            ? "bg-[#F3F2EE] dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                            : "bg-emerald-600 text-white border-b-emerald-700 font-extrabold"
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map((r, i) => (
                    <tr
                      key={i}
                      className={cn(
                        "h-[26px] transition-colors",
                        fmt === "xlsx"
                          ? i % 2 === 1
                            ? "bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40"
                            : "hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40"
                          : "hover:bg-zinc-100/80 dark:hover:bg-zinc-900/60"
                      )}
                    >
                      {/* Row numbering column */}
                      <td className="sticky left-0 z-10 bg-[#F3F2EE] dark:bg-zinc-900 text-zinc-500 font-mono font-medium text-[10.5px] text-center border-r border-b border-[#E6E4DD] dark:border-zinc-800 select-none">
                        {i + 1}
                      </td>
                      {/* Cell values */}
                      {r.map((c, j) => (
                        <td
                          key={j}
                          title={`${headers[j]}: ${c}`}
                          onDoubleClick={handleCellDoubleClick}
                          className="px-3 py-1.5 border-r border-b border-zinc-200/80 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-200 whitespace-nowrap max-w-[250px] truncate cursor-not-allowed select-none text-xs"
                        >
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer: format toggle + actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-extrabold text-zinc-500 uppercase tracking-wider">
              TARGET FORMAT
            </span>
            <div className="inline-flex bg-[#F3F2EE] dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setFmt("csv")}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                  fmt === "csv"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full transition-colors", fmt === "csv" ? "bg-emerald-500" : "bg-transparent")} />
                <span>CSV (Raw Data)</span>
              </button>
              <button
                type="button"
                onClick={() => setFmt("xlsx")}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                  fmt === "xlsx"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full transition-colors", fmt === "xlsx" ? "bg-emerald-500" : "bg-transparent")} />
                <span>Excel (Styled)</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onOpenChange(false)}
              className="px-5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs transition"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading || dataRows.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition"
            >
              <FileDown size={14} />
              <span>{downloading ? "Exporting…" : `Download ${fmt === "csv" ? "CSV" : "Excel"}`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
