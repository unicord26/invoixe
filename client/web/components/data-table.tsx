"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type Column<T> = {
  /** Stable key; also used for the cell's React key. */
  key: string;
  header: React.ReactNode;
  /** Render the cell for a row. */
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  /** Extra classes on both the header and body cells. */
  className?: string;
};

/**
 * Generic table with built-in loading (skeleton rows), error, and empty states.
 * Keeps every list screen consistent without re-implementing markup. Rows are
 * keyed via `getRowKey`; `onRowClick` makes the whole row a button-like target.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  isLoading,
  error,
  emptyMessage = "Nothing here yet.",
  onRowClick,
  className,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  getRowKey: (row: T) => string;
  isLoading?: boolean;
  error?: unknown;
  emptyMessage?: React.ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
}) {
  const alignClass = (a?: Column<T>["align"]) =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  return (
    <div className={cn("overflow-hidden rounded-xl border border-gray-200 bg-white", className)}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              {columns.map((c) => (
                <TableHead
                  key={c.key}
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wide text-gray-500",
                    alignClass(c.align),
                    c.className
                  )}
                >
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {columns.map((c) => (
                    <TableCell key={c.key} className={c.className}>
                      <Skeleton className="h-4 w-full max-w-[140px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-sm text-red-600">
                  Failed to load: {error instanceof Error ? error.message : String(error)}
                </TableCell>
              </TableRow>
            ) : !rows || rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-10 text-center text-sm text-gray-500">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={getRowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {columns.map((c) => (
                    <TableCell key={c.key} className={cn(alignClass(c.align), c.className)}>
                      {c.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
