import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "warning" | "muted";
  size?: "sm" | "md" | "lg";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-md font-semibold transition disabled:cursor-not-allowed disabled:opacity-55",
        size === "sm" && "min-h-11 min-w-11 px-3 text-sm",
        size === "md" && "min-h-11 min-w-11 px-4 text-sm",
        size === "lg" && "min-h-12 px-6 text-base",
        variant === "primary" && "bg-primary-700 text-white hover:bg-primary-800",
        variant === "secondary" && "bg-primary-100 text-primary-900 hover:bg-primary-200",
        variant === "outline" && "border border-line bg-white text-ink hover:bg-primary-50",
        variant === "ghost" && "text-muted hover:bg-primary-50 hover:text-primary-800",
        variant === "danger" && "bg-danger text-white hover:bg-red-800",
        variant === "success" && "bg-success text-white hover:bg-emerald-800",
        variant === "warning" && "bg-warning text-white hover:bg-amber-700",
        variant === "muted" && "bg-slate-100 text-slate-700 hover:bg-slate-200",
        className
      )}
      {...props}
    />
  );
}
