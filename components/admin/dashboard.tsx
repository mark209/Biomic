"use client";

import { Bell, CalendarDays, CheckCircle2, ClipboardList, Eye, FileText, Inbox, ReceiptText, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminPageHeader } from "./admin-page-header";
import { Button } from "@/components/ui/button";
import { CustomerBadges } from "@/components/ui/customer-badges";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import { badgesForInquiry, formatDateInput, getScheduleWindow, nextServiceDateFrom, scheduleWindowLabel, sortInquiriesForOps } from "@/lib/service-workflow";

type Inquiry = Database["public"]["Tables"]["inquiries"]["Row"];
type Quotation = Database["public"]["Tables"]["quotations"]["Row"];
type Schedule = Database["public"]["Tables"]["service_schedules"]["Row"];
type Customer = Database["public"]["Tables"]["customers"]["Row"];

export function Dashboard() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [inq, quote, schedule, customer] = await Promise.all([
        supabase.from("inquiries").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("quotations").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("service_schedules").select("*").order("next_service_date", { ascending: true }).limit(50),
        supabase.from("customers").select("*").order("name").limit(100)
      ]);
      if (inq.error) setError(inq.error.message);
      if (quote.error) setError(quote.error.message);
      if (schedule.error) setError(schedule.error.message);
      setInquiries(inq.data ?? []);
      setQuotations(quote.data ?? []);
      setSchedules((schedule.data ?? []) as Schedule[]);
      setCustomers((customer.data ?? []) as Customer[]);
    }
    load();
  }, []);

  const pending = quotations.filter((quote) => quote.status === "Draft" || quote.status === "Sent").length;
  const approved = quotations.filter((quote) => quote.status === "Approved").length;
  const completed = quotations.filter((quote) => quote.status === "Completed").length;
  const priorityInquiries = sortInquiriesForOps(inquiries);
  const dueSchedules = schedules
    .filter((schedule) => ["today", "upcoming", "overdue"].includes(getScheduleWindow(schedule)))
    .sort((a, b) => {
      const priority = { overdue: 0, today: 1, upcoming: 2, later: 3 };
      const priorityDiff = priority[getScheduleWindow(a)] - priority[getScheduleWindow(b)];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.next_service_date).getTime() - new Date(b.next_service_date).getTime();
    });

  async function updateSchedule(schedule: Schedule, patch: Partial<Schedule>) {
    const supabase = createClient();
    const { error: updateError } = await (supabase as any).from("service_schedules").update(patch).eq("id", schedule.id);
    if (updateError) setError(updateError.message);
    const { data } = await supabase.from("service_schedules").select("*").order("next_service_date", { ascending: true }).limit(50);
    setSchedules((data ?? []) as Schedule[]);
  }

  async function markCompleted(schedule: Schedule) {
    const supabase = createClient();
    const completedDate = new Date();
    await (supabase as any).from("notifications").update({ is_read: true }).eq("related_schedule_id", schedule.id);
    await updateSchedule(schedule, {
      last_service_date: formatDateInput(completedDate),
      status: schedule.recurrence_type === "none" ? "completed" : "active",
      next_service_date: schedule.recurrence_type === "none" ? schedule.next_service_date : nextServiceDateFrom(schedule.recurrence_type, completedDate)
    });
  }

  return (
    <section>
      <AdminPageHeader
        title="Overview"
        description="Real-time operational metrics for inquiries and quotations."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/customers"><Button variant="outline"><UserRound className="h-4 w-4" /> New Customer</Button></Link>
            <Link href="/admin/quotation-builder"><Button variant="outline"><FileText className="h-4 w-4" /> Create Quotation</Button></Link>
            <Link href="/admin/inquiries"><Button><Bell className="h-4 w-4" /> New Inquiry</Button></Link>
          </div>
        }
      />
      {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-danger">{error}</div> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard title="New Inquiries" value={inquiries.filter((inq) => inq.status === "New").length} icon={Inbox} tone="blue" />
        <DashboardCard title="Pending Quotes" value={pending} icon={ClipboardList} tone="amber" />
        <DashboardCard title="Approved Quotes" value={approved} icon={CheckCircle2} tone="green" />
        <DashboardCard title="Completed Jobs" value={completed} icon={ReceiptText} tone="gray" />
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.9fr]">
        <div className="admin-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line bg-white px-5 py-4">
            <h2 className="font-bold text-ink">Recent Inquiries</h2>
            <Link href="/admin/inquiries" className="inline-flex min-h-11 items-center text-sm font-bold text-primary-700">View all</Link>
          </div>
          <div className="divide-y divide-line">
            {priorityInquiries.slice(0, 6).map((inquiry) => (
              <div key={inquiry.id} className={`grid gap-3 p-4 lg:grid-cols-[8rem_minmax(0,1fr)_8rem_7rem] lg:items-start ${inquiry.status === "New" ? "bg-primary-50/50" : ""}`}>
                <span className="break-words font-bold text-primary-800">{inquiry.reference_number}</span>
                <span className="grid min-w-0 gap-2 text-sm text-ink">
                  <span className="break-words font-semibold">
                    {inquiry.customer_name}
                    <span className="mt-1 block break-words font-normal text-muted">{inquiry.service_type}</span>
                  </span>
                  <CustomerBadges badges={badgesForInquiry(inquiry, inquiries, quotations, schedules)} />
                </span>
                <StatusBadge value={inquiry.status} />
                <span className="text-sm text-muted">{formatDate(inquiry.created_at)}</span>
                <span className="flex flex-wrap justify-start gap-2 lg:col-span-4">
                  <Link href={`/admin/inquiries?focus=${inquiry.id}`}><Button size="sm" variant="outline"><Eye className="h-4 w-4" /> View Inquiry</Button></Link>
                  <Link href={inquiry.customer_id ? `/admin/customers/${inquiry.customer_id}` : `/admin/customers?phone=${encodeURIComponent(inquiry.contact_number)}`}><Button size="sm" variant="outline">View Customer</Button></Link>
                  <Link href={`/admin/quotation-builder?inquiry=${inquiry.id}`}><Button size="sm">Quote</Button></Link>
                </span>
              </div>
            ))}
            {!inquiries.length ? <p className="p-5 text-sm text-muted">No inquiries yet.</p> : null}
          </div>
        </div>
        <div className="grid gap-5">
          <div className="admin-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-ink">Upcoming Services</h2>
              <Link href="/admin/service-schedule" className="inline-flex min-h-11 items-center text-sm font-bold text-primary-700">View all</Link>
            </div>
            <div className="mt-4 grid gap-3">
              {dueSchedules.slice(0, 5).map((schedule) => (
                <div key={schedule.id} className="rounded-lg border border-line bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary-700" />
                      <p className="text-sm font-bold text-ink">{schedule.service_type}</p>
                    </div>
                    <StatusBadge value={scheduleWindowLabel(getScheduleWindow(schedule))} />
                  </div>
                  <p className="mt-1 text-sm text-muted">{formatDate(schedule.next_service_date)}</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{customers.find((customer) => customer.id === schedule.customer_id)?.name ?? "Customer"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/admin/customers/${schedule.customer_id}`}><Button size="sm" variant="outline">View Customer</Button></Link>
                    <Link href={`/admin/quotation-builder?customer=${schedule.customer_id}`}><Button size="sm" variant="outline">Create Quotation</Button></Link>
                    <Button size="sm" variant="success" onClick={() => markCompleted(schedule)}><CheckCircle2 className="h-4 w-4" /> Mark Completed</Button>
                  </div>
                </div>
              ))}
              {!dueSchedules.length ? <p className="rounded-lg border border-dashed border-line p-5 text-center text-sm text-muted">No due or overdue services.</p> : null}
            </div>
          </div>
          <div className="admin-panel p-5">
            <h2 className="font-bold text-ink">Activity Feed</h2>
            <div className="mt-5 grid gap-4 border-l border-line pl-4">
              {quotations.slice(0, 4).map((quote) => (
                <div key={quote.id} className="relative">
                  <span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-primary-700 ring-4 ring-white" />
                  <p className="text-sm font-bold text-ink">{quote.quotation_number}</p>
                  <p className="text-sm text-muted">{quote.customer_name} - {quote.status}</p>
                </div>
              ))}
              {!quotations.length ? <p className="text-sm text-muted">No quotation activity yet.</p> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
