"use client";

import { CalendarDays, ClipboardList, FileText, Inbox } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "./admin-page-header";
import { Button } from "@/components/ui/button";
import { CustomerBadges } from "@/components/ui/customer-badges";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { formatDate, money } from "@/lib/utils";
import { badgesForCustomer, contactKey, getScheduleWindow, recurrenceLabels, scheduleWindowLabel } from "@/lib/service-workflow";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Inquiry = Database["public"]["Tables"]["inquiries"]["Row"];
type Quotation = Database["public"]["Tables"]["quotations"]["Row"];
type Schedule = Database["public"]["Tables"]["service_schedules"]["Row"];

function timelineMarkerClass(status: string) {
  if (["Completed", "Approved", "active", "completed"].includes(status)) return "bg-emerald-100 text-emerald-800";
  if (["OVERDUE", "Rejected"].includes(status)) return "bg-red-100 text-red-800";
  if (["UPCOMING", "Under Review"].includes(status)) return "bg-amber-100 text-amber-800";
  if (["Scheduled", "SCHEDULED"].includes(status)) return "bg-indigo-100 text-indigo-800";
  if (status === "Quoted") return "bg-purple-100 text-purple-800";
  return "bg-primary-100 text-primary-800";
}

export function CustomerProfile({ customerId }: { customerId: string }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [customerResult, inquiryResult, quoteResult, scheduleResult] = await Promise.all([
        supabase.from("customers").select("*").eq("id", customerId).single(),
        supabase.from("inquiries").select("*").order("created_at", { ascending: false }),
        supabase.from("quotations").select("*").order("created_at", { ascending: false }),
        supabase.from("service_schedules").select("*").eq("customer_id", customerId).order("next_service_date", { ascending: true })
      ]);
      if (customerResult.error) setError(customerResult.error.message);
      const loadedCustomer = customerResult.data as Customer | null;
      setCustomer(loadedCustomer);
      const customerPhone = contactKey(loadedCustomer?.contact_number);
      setInquiries(((inquiryResult.data ?? []) as Inquiry[]).filter((inquiry) => inquiry.customer_id === customerId || contactKey(inquiry.contact_number) === customerPhone));
      setQuotations(((quoteResult.data ?? []) as Quotation[]).filter((quote) => quote.customer_id === customerId || contactKey(quote.contact_number) === customerPhone));
      setSchedules((scheduleResult.data ?? []) as Schedule[]);
    }
    load();
  }, [customerId]);

  const activeMonthly = schedules.filter((schedule) => schedule.status === "active" && schedule.recurrence_type === "monthly");
  const nextService = schedules.find((schedule) => schedule.status === "active");
  const customerBadges = customer ? badgesForCustomer(customer, inquiries, quotations, schedules) : [];
  const timeline = useMemo(() => {
    const inquiryEvents = inquiries.map((inquiry) => ({
      date: inquiry.created_at,
      title: "Inquiry submitted",
      detail: `${inquiry.reference_number} - ${inquiry.service_type}`,
      icon: Inbox,
      status: inquiry.status
    }));
    const quoteEvents = quotations.flatMap((quote) => [
      { date: quote.created_at, title: "Quotation created", detail: `${quote.quotation_number} - ${money(quote.grand_total)}`, icon: FileText, status: quote.status },
      ...(quote.status === "Approved" ? [{ date: quote.updated_at, title: "Quotation approved", detail: quote.quotation_number, icon: ClipboardList, status: "Approved" }] : [])
    ]);
    const scheduleEvents = schedules.flatMap((schedule) => [
      { date: schedule.created_at, title: "Service scheduled", detail: `${schedule.service_type} - ${formatDate(schedule.next_service_date)}`, icon: CalendarDays, status: scheduleWindowLabel(getScheduleWindow(schedule)) },
      ...(schedule.last_service_date ? [{ date: schedule.last_service_date, title: "Service completed", detail: schedule.service_type, icon: CalendarDays, status: "Completed" }] : [])
    ]);
    return [...inquiryEvents, ...quoteEvents, ...scheduleEvents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [inquiries, quotations, schedules]);

  if (!customer && !error) return <p className="text-sm text-muted">Loading customer...</p>;

  return (
    <section>
      <AdminPageHeader
        title={customer?.name ?? "Customer Profile"}
        description="Customer details, history, quotations, and active service schedule."
        action={
          customer ? (
            <div className="flex flex-wrap gap-2">
              <Link href={`/admin/service-schedule?customer=${customer.id}`}><Button variant="outline"><CalendarDays className="h-4 w-4" /> Create Monthly Service</Button></Link>
              <Link href={`/admin/quotation-builder?customer=${customer.id}`}><Button><FileText className="h-4 w-4" /> Create Quotation</Button></Link>
            </div>
          ) : null
        }
      />
      {customer ? <div className="mb-4"><CustomerBadges badges={customerBadges} /></div> : null}
      {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-danger">{error}</div> : null}
      {customer ? (
        <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="grid gap-5">
            <section className="admin-panel p-5">
              <h2 className="font-bold text-ink">Customer Details</h2>
              <dl className="mt-4 grid gap-3 text-sm">
                <div><dt className="font-bold text-ink">Contact number</dt><dd className="text-muted">{customer.contact_number}</dd></div>
                <div><dt className="font-bold text-ink">Email</dt><dd className="text-muted">{customer.email || "No email"}</dd></div>
                <div><dt className="font-bold text-ink">Address</dt><dd className="text-muted">{customer.address}</dd></div>
                <div><dt className="font-bold text-ink">Notes</dt><dd className="text-muted">{customer.notes || "No notes"}</dd></div>
              </dl>
            </section>
            <section className="admin-panel p-5">
              <h2 className="font-bold text-ink">Active Monthly Service</h2>
              <div className="mt-4 grid gap-3">
                {activeMonthly.map((schedule) => (
                  <div key={schedule.id} className="rounded-lg border border-line bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-ink">{schedule.service_type}</p>
                      <StatusBadge value={schedule.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted">Next service: {formatDate(schedule.next_service_date)}</p>
                    <p className="mt-1 text-sm text-muted">Recurrence: {recurrenceLabels[schedule.recurrence_type]}</p>
                  </div>
                ))}
                {!activeMonthly.length ? <p className="text-sm text-muted">No active monthly service.</p> : null}
              </div>
            </section>
            <section className="admin-panel p-5">
              <h2 className="font-bold text-ink">Next Scheduled Service</h2>
              {nextService ? (
                <div className="mt-4 rounded-lg border border-line bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-ink">{nextService.service_type}</p>
                    <StatusBadge value={scheduleWindowLabel(getScheduleWindow(nextService))} />
                  </div>
                  <p className="mt-1 text-sm text-muted">{formatDate(nextService.next_service_date)}</p>
                </div>
              ) : <p className="mt-3 text-sm text-muted">No scheduled service.</p>}
            </section>
          </div>

          <div className="grid gap-5">
            <section className="admin-panel p-5">
              <h2 className="font-bold text-ink">Service History</h2>
              <div className="mt-5 grid gap-4 border-l border-line pl-4">
                {timeline.map((event, index) => {
                  const Icon = event.icon;
                  return (
                    <div key={`${event.title}-${event.date}-${index}`} className="relative">
                      <span className={`absolute -left-[25px] top-0 grid h-5 w-5 place-items-center rounded-full ring-4 ring-white ${timelineMarkerClass(event.status)}`}>
                        <Icon className="h-3 w-3" />
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-ink">{event.title}</p>
                        <StatusBadge value={event.status} />
                      </div>
                      <p className="text-sm text-muted">{event.detail}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">{formatDate(event.date)}</p>
                    </div>
                  );
                })}
                {!timeline.length ? <p className="text-sm text-muted">No customer history yet.</p> : null}
              </div>
            </section>
            <section className="admin-panel p-5">
              <h2 className="font-bold text-ink">Quotation History</h2>
              <div className="mt-4 grid gap-3">
                {quotations.map((quote) => (
                  <div key={quote.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-slate-50 p-3">
                    <div><p className="text-sm font-bold text-primary-800">{quote.quotation_number}</p><p className="text-sm text-muted">{money(quote.grand_total)}</p></div>
                    <StatusBadge value={quote.status} />
                  </div>
                ))}
                {!quotations.length ? <p className="text-sm text-muted">No quotations yet.</p> : null}
              </div>
            </section>
            <section className="admin-panel p-5">
              <h2 className="font-bold text-ink">Inquiry History</h2>
              <div className="mt-4 grid gap-3">
                {inquiries.map((inquiry) => (
                  <div key={inquiry.id} className="rounded-lg border border-line bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-primary-800">{inquiry.reference_number}</p>
                      <StatusBadge value={inquiry.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted">{inquiry.service_type}</p>
                  </div>
                ))}
                {!inquiries.length ? <p className="text-sm text-muted">No inquiries yet.</p> : null}
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </section>
  );
}
