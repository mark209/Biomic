import { cn } from "@/lib/utils";
import { statusControlClass } from "./status-badge";

export function StatusSelect({
  value,
  options,
  onValueChange,
  label,
  className
}: {
  value: string;
  options: readonly string[];
  onValueChange: (value: string) => void;
  label: string;
  className?: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      className={cn(
        "focus-ring min-h-10 max-w-full rounded-full border border-transparent px-3 pr-8 text-xs font-bold leading-tight shadow-sm ring-1",
        statusControlClass(value),
        className
      )}
    >
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  );
}
