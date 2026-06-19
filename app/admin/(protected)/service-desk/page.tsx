import { Suspense } from "react";
import { ServiceDeskWorkspace } from "@/components/admin/service-desk-workspace";

export default function ServiceDeskPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading service desk...</p>}>
      <ServiceDeskWorkspace />
    </Suspense>
  );
}
