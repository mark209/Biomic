import { Suspense } from "react";
import { QuotationsWorkspace } from "@/components/admin/quotations-workspace";

export default function QuotationsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading quotations...</p>}>
      <QuotationsWorkspace />
    </Suspense>
  );
}
