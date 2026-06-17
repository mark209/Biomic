import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  Clock3,
  FileText,
  Send,
  Sparkles,
  UserCheck,
  UserPlus,
  XCircle
} from "lucide-react";

const statusMeta = {
  New: { className: "bg-primary-100 text-primary-900 ring-primary-200", icon: Bell },
  "Under Review": { className: "bg-amber-100 text-amber-950 ring-amber-200", icon: Clock3 },
  Quoted: { className: "bg-purple-100 text-purple-950 ring-purple-200", icon: FileText },
  Approved: { className: "bg-emerald-100 text-emerald-950 ring-emerald-200", icon: CheckCircle2 },
  Scheduled: { className: "bg-indigo-100 text-indigo-950 ring-indigo-200", icon: CalendarDays },
  Completed: { className: "bg-emerald-100 text-emerald-950 ring-emerald-200", icon: CheckCircle2 },
  Cancelled: { className: "bg-slate-200 text-slate-800 ring-slate-300", icon: XCircle },
  Rejected: { className: "bg-red-100 text-red-950 ring-red-200", icon: XCircle },
  Overdue: { className: "bg-red-100 text-red-950 ring-red-200", icon: AlertTriangle },
  "Due Soon": { className: "bg-amber-100 text-amber-950 ring-amber-200", icon: AlertTriangle },
  Active: { className: "bg-emerald-100 text-emerald-950 ring-emerald-200", icon: CheckCircle2 },
  Paused: { className: "bg-amber-100 text-amber-950 ring-amber-200", icon: Clock3 },
  Draft: { className: "bg-slate-100 text-slate-800 ring-slate-200", icon: CircleDashed },
  Sent: { className: "bg-primary-100 text-primary-900 ring-primary-200", icon: Send },
  active: { className: "bg-emerald-100 text-emerald-950 ring-emerald-200", icon: CheckCircle2 },
  paused: { className: "bg-amber-100 text-amber-950 ring-amber-200", icon: Clock3 },
  completed: { className: "bg-emerald-100 text-emerald-950 ring-emerald-200", icon: CheckCircle2 },
  cancelled: { className: "bg-slate-200 text-slate-800 ring-slate-300", icon: XCircle },
  inactive: { className: "bg-slate-200 text-slate-800 ring-slate-300", icon: CircleDashed },
  TODAY: { className: "bg-primary-100 text-primary-900 ring-primary-200", icon: CalendarDays },
  UPCOMING: { className: "bg-amber-100 text-amber-950 ring-amber-200", icon: AlertTriangle },
  OVERDUE: { className: "bg-red-100 text-red-950 ring-red-200", icon: AlertTriangle },
  SCHEDULED: { className: "bg-indigo-100 text-indigo-950 ring-indigo-200", icon: CalendarDays },
  "NEW CUSTOMER": { className: "bg-primary-100 text-primary-900 ring-primary-200", icon: UserPlus },
  "RETURNING CUSTOMER": { className: "bg-slate-100 text-slate-800 ring-slate-200", icon: UserCheck },
  "MONTHLY SERVICE": { className: "bg-emerald-100 text-emerald-950 ring-emerald-200", icon: CalendarDays },
  "UPCOMING SERVICE": { className: "bg-amber-100 text-amber-950 ring-amber-200", icon: AlertTriangle }
};

type StatusKey = keyof typeof statusMeta;

function metaFor(value: string) {
  return statusMeta[value as StatusKey] ?? { className: "bg-slate-100 text-slate-800 ring-slate-200", icon: Sparkles };
}

export function statusControlClass(value: string | undefined | null) {
  if (!value) return "bg-slate-100 text-slate-800 ring-slate-200";
  return metaFor(value).className;
}

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  const meta = metaFor(value);
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-left text-xs font-bold leading-tight ring-1",
        meta.className,
        className
      )}
      aria-label={`Status: ${value}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {value}
    </span>
  );
}
