"use client";

import { Archive, CheckCircle2, FileText, Plus, ReceiptText, Send } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AdminPageHeader } from "./admin-page-header";
import { QuotationBuilder } from "./quotation-builder";
import { QuotationsManager } from "./quotations-manager";
import { WorkflowTabs } from "./workflow-tabs";
import { Button } from "@/components/ui/button";

const statusTabs = [
  { key: "all", label: "All Quotations", status: "All", icon: ReceiptText },
  { key: "drafts", label: "Drafts", status: "Draft", icon: FileText },
  { key: "approved", label: "Approved", status: "Approved", icon: CheckCircle2 },
  { key: "sent", label: "Sent", status: "Sent", icon: Send },
  { key: "archived", label: "Archived", status: "Archived", icon: Archive }
] as const;

function selectedStatus(tab: string | null) {
  return statusTabs.find((item) => item.key === tab) ?? statusTabs[0];
}

export function QuotationsWorkspace() {
  const params = useSearchParams();
  const action = params.get("action");
  const selected = selectedStatus(params.get("tab"));
  const builderQuery = new URLSearchParams(params.toString());
  builderQuery.set("action", "create");

  if (action === "create") {
    return (
      <section>
        <AdminPageHeader
          title="Quotations"
          description="Create and manage customer quotation records from one workflow."
          action={
            <Link href="/admin/quotations">
              <Button variant="outline">Back to quotations</Button>
            </Link>
          }
        />
        <WorkflowTabs
          tabs={[
            { href: "/admin/quotations", label: "All Quotations", icon: ReceiptText, active: false },
            { href: `/admin/quotations?${builderQuery.toString()}`, label: "Create Quotation", icon: Plus, active: true }
          ]}
        />
        <QuotationBuilder showHeader={false} />
      </section>
    );
  }

  return (
    <section>
      <AdminPageHeader
        title="Quotations"
        description="Review quote status, totals, and export customer-ready PDF files."
        action={
          <Link href="/admin/quotations?action=create">
            <Button><Plus className="h-4 w-4" /> Create quotation</Button>
          </Link>
        }
      />
      <WorkflowTabs
        tabs={statusTabs.map((tab) => ({
          href: tab.key === "all" ? "/admin/quotations" : `/admin/quotations?tab=${tab.key}`,
          label: tab.label,
          icon: tab.icon,
          active: selected.key === tab.key
        }))}
      />
      <QuotationsManager initialStatus={selected.status} showHeader={false} />
    </section>
  );
}
