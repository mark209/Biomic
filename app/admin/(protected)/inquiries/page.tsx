import { Suspense } from "react";
import { InquiriesManager } from "@/components/admin/inquiries-manager";

export default function InquiriesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading inquiries...</p>}>
      <InquiriesManager />
    </Suspense>
  );
}
