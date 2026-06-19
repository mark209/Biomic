"use client";

import { CalendarDays, ContactRound, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { CustomersManager } from "./customers-manager";
import { InquiriesManager } from "./inquiries-manager";
import { ServiceScheduleManager } from "./service-schedule-manager";
import { WorkflowTabs } from "./workflow-tabs";

type ServiceDeskTab = "customers" | "inquiries" | "schedule";

function selectedTab(value: string | null): ServiceDeskTab {
  if (value === "inquiries" || value === "schedule") return value;
  return "customers";
}

export function ServiceDeskWorkspace() {
  const params = useSearchParams();
  const tab = selectedTab(params.get("tab"));

  return (
    <section>
      <WorkflowTabs
        tabs={[
          { href: "/admin/service-desk?tab=customers", label: "Customers", icon: Users, active: tab === "customers" },
          { href: "/admin/service-desk?tab=inquiries", label: "Inquiries", icon: ContactRound, active: tab === "inquiries" },
          { href: "/admin/service-desk?tab=schedule", label: "Service Schedule", icon: CalendarDays, active: tab === "schedule" }
        ]}
      />
      {tab === "customers" ? <CustomersManager /> : null}
      {tab === "inquiries" ? <InquiriesManager /> : null}
      {tab === "schedule" ? <ServiceScheduleManager /> : null}
    </section>
  );
}
