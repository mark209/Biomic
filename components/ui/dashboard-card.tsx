import type { LucideIcon } from "lucide-react";

export function DashboardCard({
  title,
  value,
  detail,
  icon: Icon,
  tone = "blue"
}: {
  title: string;
  value: string | number;
  detail?: string;
  icon: LucideIcon;
  tone?: "blue" | "amber" | "green" | "gray" | "red" | "purple";
}) {
  const tones = {
    blue: "border-primary-700 bg-primary-700 text-white",
    amber: "border-amber-200 bg-amber-100 text-amber-950",
    green: "border-emerald-200 bg-emerald-100 text-emerald-950",
    gray: "border-slate-200 bg-slate-100 text-slate-900",
    red: "border-red-200 bg-red-100 text-red-950",
    purple: "border-purple-200 bg-purple-100 text-purple-950"
  };

  const iconTones = {
    blue: "bg-white/15 text-white",
    amber: "bg-amber-200 text-amber-950",
    green: "bg-emerald-200 text-emerald-950",
    gray: "bg-white text-slate-900",
    red: "bg-red-200 text-red-950",
    purple: "bg-purple-200 text-purple-950"
  };

  return (
    <div className={`relative overflow-hidden rounded-lg border p-5 shadow-panel ${tones[tone]}`}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-bold uppercase tracking-wide opacity-80">{title}</span>
        <span className={`grid h-10 w-10 place-items-center rounded-md ${iconTones[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-5 text-4xl font-extrabold">{value}</div>
      {detail ? <p className="mt-2 text-sm font-medium opacity-80">{detail}</p> : null}
    </div>
  );
}
