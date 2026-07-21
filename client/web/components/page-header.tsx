import { cn } from "@/lib/utils";

/**
 * Consistent page heading: title, description, and a
 * right-aligned actions slot. Presentational + server-safe (no client hooks) so
 * it can render inside either server or client screens.
 */
export function PageHeader({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 sm:mb-8 flex flex-wrap items-end justify-between gap-3 sm:gap-4", className)}>
      <div className="min-w-0">
        <h1 className="truncate text-xl sm:text-2xl font-extrabold tracking-tight text-gray-900">{title}</h1>
        {description && <p className="mt-0.5 text-xs sm:text-sm text-gray-500">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </header>
  );
}
