import { Suspense } from "react";
import { QuotationsManager } from "@/components/admin/quotations-manager";

export default function QuotationsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading quotations...</p>}>
      <QuotationsManager />
    </Suspense>
  );
}
