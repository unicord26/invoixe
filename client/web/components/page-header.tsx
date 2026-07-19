import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Consistent page heading: optional back link, title, description, and a
 * right-aligned actions slot. Presentational + server-safe (no client hooks) so
 * it can render inside either server or client screens.
 */
export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Back",
  children,
  className,
}: {
  title: string;
  description?: string;
  /** When set, renders a subtle back link above the title. */
  backHref?: string;
  backLabel?: string;
  /** Right-aligned action controls (buttons, dialogs…). */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 sm:mb-8 flex flex-wrap items-end justify-between gap-3 sm:gap-4", className)}>
      <div className="min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="mb-1 inline-flex items-center gap-1 text-sm text-green-700 transition hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </Link>
        )}
        <h1 className="truncate text-xl sm:text-2xl font-extrabold tracking-tight text-gray-900">{title}</h1>
        {description && <p className="mt-0.5 text-xs sm:text-sm text-gray-500">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </header>
  );
}
