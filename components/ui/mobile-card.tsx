import { StatusBadge } from "./status-badge";

export function MobileCard({
  title,
  subtitle,
  status,
  meta,
  action
}: {
  title: string;
  subtitle: string;
  status?: string;
  meta?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words font-bold text-ink">{title}</h3>
          <p className="mt-1 break-words text-sm text-muted">{subtitle}</p>
        </div>
        {status ? <StatusBadge value={status} className="shrink-0" /> : null}
      </div>
      <div className="mt-4 border-t border-line pt-3 text-sm text-muted">
        {meta ? <span className="break-words font-semibold">{meta}</span> : null}
        {action ? <div className="mt-3 flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  );
}
