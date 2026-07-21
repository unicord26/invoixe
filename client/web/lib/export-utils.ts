import * as XLSX from "xlsx";

/**
 * Format string[][] header matrix into CSV string
 */
export function rowsToCsv(rows: string[][]): string {
  return rows
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

/**
 * Export matrix to CSV file download
 */
export function exportToCsv(rows: string[][], filename: string) {
  const csvContent = rowsToCsv(rows);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export matrix to clean native binary Microsoft Excel (.xlsx) file
 */
export function exportToExcel(rows: string[][], filename: string, sheetName = "Export") {
  const cleanFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Auto-set column widths for clean readability in Excel
  if (rows.length > 0) {
    const colWidths = rows[0]!.map((_, colIdx) => {
      let maxLen = 12;
      rows.forEach((row) => {
        const val = String(row[colIdx] ?? "");
        if (val.length > maxLen) maxLen = Math.min(val.length + 3, 50);
      });
      return { wch: maxLen };
    });
    ws["!cols"] = colWidths;
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, cleanFilename);
}

/**
 * Helper to estimate byte size for display
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
