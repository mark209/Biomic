import { Suspense } from "react";
import { QuotationBuilder } from "@/components/admin/quotation-builder";

export default function QuotationBuilderPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading builder...</p>}>
      <QuotationBuilder />
    </Suspense>
  );
}
