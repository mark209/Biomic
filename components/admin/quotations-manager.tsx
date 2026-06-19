"use client";

import { CalendarDays, Download, FileText } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "./admin-page-header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { MobileCard } from "@/components/ui/mobile-card";
import { StatusSelect } from "@/components/ui/status-select";
import type { Database } from "@/lib/database.types";
import { downloadQuotationPdf } from "@/lib/pdf";
import { getSafeErrorMessage } from "@/lib/security";
import { createClient } from "@/lib/supabase/client";
import { formatDate, money } from "@/lib/utils";

type Quotation = Database["public"]["Tables"]["quotations"]["Row"];
type QuotationItem = Database["public"]["Tables"]["quotation_items"]["Row"];
const quotationStatuses = ["Draft", "Sent", "Approved", "Rejected", "Completed"];

function inquiryStatusForQuotationStatus(status: string) {
  if (status === "Completed") return "Completed";
  if (status === "Approved") return "Approved";
  if (status === "Rejected") return "Cancelled";
  if (status === "Sent" || status === "Draft") return "Quoted";
  return null;
}

export function QuotationsManager({
  initialStatus = "All",
  showHeader = true
}: {
  initialStatus?: string;
  showHeader?: boolean;
}) {
  const params = useSearchParams();
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const [quoteResult, itemResult] = await Promise.all([
      supabase.from("quotations").select("*").order("created_at", { ascending: false }),
      supabase.from("quotation_items").select("*").order("sort_order")
    ]);
    if (quoteResult.error) setError(getSafeErrorMessage("load quotations"));
    setQuotes(quoteResult.data ?? []);
    setItems((itemResult.data ?? []) as QuotationItem[]);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const search = params.get("search");
    if (search) setQuery(search);
  }, [params]);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  const filtered = useMemo(() => {
    return quotes.filter((quote) => {
      const matchesStatus = status === "All" || quote.status === status;
      return matchesStatus && `${quote.quotation_number} ${quote.customer_name} ${quote.contact_number}`.toLowerCase().includes(query.toLowerCase());
    });
  }, [quotes, query, status]);
  const filterStatuses = useMemo(() => (quotationStatuses.includes(status) || status === "All" ? quotationStatuses : [status, ...quotationStatuses]), [status]);

  async function updateStatus(quote: Quotation, nextStatus: string) {
    const supabase = createClient();
    const { error: updateError } = await (supabase as any).from("quotations").update({ status: nextStatus }).eq("id", quote.id);
    if (updateError) {
      setError(getSafeErrorMessage("update the quotation"));
      return;
    }

    const nextInquiryStatus = inquiryStatusForQuotationStatus(nextStatus);
    if (quote.inquiry_id && nextInquiryStatus) {
      const { error: inquiryError } = await (supabase as any).from("inquiries").update({ status: nextInquiryStatus }).eq("id", quote.inquiry_id);
      if (inquiryError) setError(getSafeErrorMessage("update the linked inquiry"));
    }

    await load();
  }

  function exportPdf(quote: Quotation) {
    downloadQuotationPdf({
      ...quote,
      subtotal: Number(quote.subtotal),
      discount: Number(quote.discount),
      grand_total: Number(quote.grand_total),
      items: items
        .filter((item) => item.quotation_id === quote.id)
        .map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          line_total: Number(item.line_total)
        }))
    });
  }

  const columns: Column<Quotation>[] = [
    { key: "number", header: "Quotation", cell: (row) => <span className="font-bold text-primary-800">{row.quotation_number}</span> },
    { key: "customer", header: "Customer", cell: (row) => <span>{row.customer_name}<br /><span className="text-muted">{row.contact_number}</span></span> },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <StatusSelect
          value={row.status}
          options={quotationStatuses}
          onValueChange={(nextStatus) => updateStatus(row, nextStatus)}
          label={`Update quotation status for ${row.quotation_number}`}
        />
      )
    },
    { key: "total", header: "Grand Total", cell: (row) => money(row.grand_total) },
    { key: "date", header: "Date", cell: (row) => formatDate(row.created_at) },
    {
      key: "action",
      header: "PDF",
      className: "px-4 py-3 text-right",
      cell: (row) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => exportPdf(row)}><Download className="h-4 w-4" /> PDF</Button>
          <Link href={`/admin/service-desk?tab=schedule&quotation=${row.id}`}><Button size="sm" variant="outline"><CalendarDays className="h-4 w-4" /> Schedule</Button></Link>
        </div>
      )
    }
  ];

  return (
    <section>
      {showHeader ? (
        <AdminPageHeader
          title="Quotations"
          description="Review quote status, totals, and export customer-ready PDF files."
          action={<Link href="/admin/quotations?action=create"><Button><FileText className="h-4 w-4" /> Create quotation</Button></Link>}
        />
      ) : null}
      {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-danger">{error}</div> : null}
      <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,22rem)_14rem]">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search quotations, customer, phone" className="focus-ring min-h-11 rounded-md border-line bg-white text-sm" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 rounded-md border-line bg-white text-sm">
          <option>All</option>
          {filterStatuses.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <DataTable rows={filtered} columns={columns} emptyTitle="No quotations" />
      <div className="grid gap-3 lg:hidden">
        {filtered.map((quote) => (
          <MobileCard
            key={quote.id}
            title={quote.quotation_number}
            subtitle={`${quote.customer_name} - ${money(quote.grand_total)}`}
            status={quote.status}
            meta={formatDate(quote.created_at)}
            action={<><Button size="sm" variant="outline" onClick={() => exportPdf(quote)}><Download className="h-4 w-4" /> PDF</Button><Link href={`/admin/service-desk?tab=schedule&quotation=${quote.id}`}><Button size="sm" variant="outline"><CalendarDays className="h-4 w-4" /> Schedule</Button></Link></>}
          />
        ))}
      </div>
    </section>
  );
}
