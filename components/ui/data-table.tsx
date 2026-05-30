import { EmptyState } from "./empty-state";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

export function DataTable<T>({
  rows,
  columns,
  emptyTitle = "No records",
  emptyDescription = "Records will appear here once they are available.",
  breakpoint = "lg"
}: {
  rows: T[];
  columns: Column<T>[];
  emptyTitle?: string;
  emptyDescription?: string;
  breakpoint?: "lg" | "xl";
}) {
  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={`hidden overflow-x-auto rounded-lg border border-line bg-white shadow-panel ${breakpoint === "xl" ? "xl:block" : "lg:block"}`}>
      <table className="w-full border-collapse text-left">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-line bg-slate-50 text-xs uppercase tracking-wide text-muted shadow-[0_1px_0_rgba(190,200,210,0.8)]">
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3.5 font-extrabold">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line text-sm">
          {rows.map((row, index) => (
            <tr key={index} className="bg-white transition even:bg-slate-50/45 hover:bg-primary-50/70">
              {columns.map((column) => (
                <td key={column.key} className={column.className ?? "px-4 py-4 align-middle"}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
