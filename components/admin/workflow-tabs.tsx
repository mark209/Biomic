import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkflowTab = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
};

export function WorkflowTabs({ tabs, className }: { tabs: WorkflowTab[]; className?: string }) {
  return (
    <div className={cn("mb-6 overflow-x-auto", className)}>
      <nav className="inline-flex min-w-full gap-2 rounded-lg border border-line bg-white p-1.5 shadow-panel md:min-w-0" aria-label="Workflow sections">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "focus-ring inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold transition",
                tab.active ? "bg-primary-50 text-primary-800 ring-1 ring-primary-100" : "text-muted hover:bg-slate-100 hover:text-ink"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="whitespace-nowrap">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
