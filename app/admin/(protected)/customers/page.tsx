import { Suspense } from "react";
import { CustomersManager } from "@/components/admin/customers-manager";

export default function CustomersPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading customers...</p>}>
      <CustomersManager />
    </Suspense>
  );
}
