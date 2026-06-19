"use client";

import { FileText, Hammer, Package } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { CatalogManager } from "./catalog-manager";
import { ServiceTemplatesManager } from "./service-templates-manager";
import { WorkflowTabs } from "./workflow-tabs";

type ItemLibraryTab = "labor" | "parts" | "templates";

function selectedTab(value: string | null): ItemLibraryTab {
  if (value === "parts" || value === "templates") return value;
  return "labor";
}

export function ItemLibraryWorkspace() {
  const params = useSearchParams();
  const tab = selectedTab(params.get("tab"));

  return (
    <section>
      <WorkflowTabs
        tabs={[
          { href: "/admin/item-library?tab=labor", label: "Labor Items", icon: Hammer, active: tab === "labor" },
          { href: "/admin/item-library?tab=parts", label: "Parts Items", icon: Package, active: tab === "parts" },
          { href: "/admin/item-library?tab=templates", label: "Service Templates", icon: FileText, active: tab === "templates" }
        ]}
      />
      {tab === "labor" ? (
        <CatalogManager
          table="labor_items"
          title="Labor Items"
          description="Maintain default labor names and prices used for future quotations."
        />
      ) : null}
      {tab === "parts" ? (
        <CatalogManager
          table="parts_items"
          title="Parts Items"
          description="Maintain default parts names and prices used for future quotations."
        />
      ) : null}
      {tab === "templates" ? <ServiceTemplatesManager /> : null}
    </section>
  );
}
