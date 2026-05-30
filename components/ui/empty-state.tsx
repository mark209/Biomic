import type { LucideIcon } from "lucide-react";
import { ClipboardList } from "lucide-react";

export function EmptyState({
  title,
  description,
  icon: Icon = ClipboardList
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-line bg-white p-8 text-center">
      <div className="mb-3 rounded-full bg-primary-50 p-3 text-primary-700">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
    </div>
  );
}
