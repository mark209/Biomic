import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BaseProps = {
  label: string;
  error?: string;
  helperText?: string;
};

export function Input({ label, error, helperText, className, required, ...props }: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink">
      <span>{label}{required ? <span className="ml-1 text-danger">*</span> : null}</span>
      <input
        className={cn(
          "focus-ring min-h-11 min-w-0 rounded-md border-line bg-white text-sm text-ink placeholder:text-slate-400",
          error && "border-danger",
          className
        )}
        required={required}
        {...props}
      />
      {helperText && !error ? <span className="text-xs font-medium text-muted">{helperText}</span> : null}
      {error ? <span className="text-xs font-medium text-danger">{error}</span> : null}
    </label>
  );
}

export function Textarea({
  label,
  error,
  helperText,
  className,
  required,
  ...props
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink">
      <span>{label}{required ? <span className="ml-1 text-danger">*</span> : null}</span>
      <textarea
        className={cn(
          "focus-ring min-h-28 min-w-0 rounded-md border-line bg-white text-sm text-ink placeholder:text-slate-400",
          error && "border-danger",
          className
        )}
        required={required}
        {...props}
      />
      {helperText && !error ? <span className="text-xs font-medium text-muted">{helperText}</span> : null}
      {error ? <span className="text-xs font-medium text-danger">{error}</span> : null}
    </label>
  );
}

export function Select({
  label,
  error,
  helperText,
  className,
  children,
  required,
  ...props
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink">
      <span>{label}{required ? <span className="ml-1 text-danger">*</span> : null}</span>
      <select
        className={cn(
          "focus-ring min-h-11 min-w-0 rounded-md border-line bg-white text-sm text-ink",
          error && "border-danger",
          className
        )}
        required={required}
        {...props}
      >
        {children}
      </select>
      {helperText && !error ? <span className="text-xs font-medium text-muted">{helperText}</span> : null}
      {error ? <span className="text-xs font-medium text-danger">{error}</span> : null}
    </label>
  );
}
