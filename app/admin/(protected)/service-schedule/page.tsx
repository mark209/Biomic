import { Suspense } from "react";
import { ServiceScheduleManager } from "@/components/admin/service-schedule-manager";

export default function ServiceSchedulePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading service schedule...</p>}>
      <ServiceScheduleManager />
    </Suspense>
  );
}
