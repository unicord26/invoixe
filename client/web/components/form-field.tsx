import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * A labelled form control wrapper: label (+ required asterisk), the control
 * (passed as children), and an optional hint or error line. Control-agnostic —
 * wrap an Input, Select, MoneyInput, etc. Pass `htmlFor` matching the control id
 * so the label is clickable & accessible.
 */
export function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium text-gray-600">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
}
