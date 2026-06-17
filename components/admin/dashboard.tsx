"use client";

import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Inbox,
  Minus,
  ReceiptText,
  TrendingUp,
  UserRound
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminPageHeader } from "./admin-page-header";
import { Button } from "@/components/ui/button";
import { CustomerBadges } from "@/components/ui/customer-badges";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Database } from "@/lib/database.types";
import { getSafeErrorMessage } from "@/lib/security";
import { createClient } from "@/lib/supabase/client";
import { cn, formatDate } from "@/lib/utils";
import { badgesForInquiry, formatDateInput, getScheduleWindow, nextServiceDateFrom, scheduleWindowLabel, sortInquiriesForOps } from "@/lib/service-workflow";

type Inquiry = Database["public"]["Tables"]["inquiries"]["Row"];
type Quotation = Database["public"]["Tables"]["quotations"]["Row"];
type Schedule = Database["public"]["Tables"]["service_schedules"]["Row"];
type Customer = Database["public"]["Tables"]["customers"]["Row"];

function formatScheduleTime(value: string | null | undefined) {
  if (!value) return "Time not set";
  const [hours = "0", minutes = "0"] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date);
}

const metricStyles = {
  blue: {
    icon: "bg-primary-100 text-primary-700",
    value: "text-primary-700",
    trend: "text-emerald-700"
  },
  amber: {
    icon: "bg-amber-100 text-amber-700",
    value: "text-amber-700",
    trend: "text-muted"
  },
  green: {
    icon: "bg-emerald-100 text-emerald-700",
    value: "text-emerald-700",
    trend: "text-muted"
  },
  gray: {
    icon: "bg-slate-100 text-slate-700",
    value: "text-slate-900",
    trend: "text-emerald-700"
  }
};

function MetricCard({
  title,
  value,
  icon: Icon,
  tone,
  detail,
  positive = false
}: {
  title: string;
  value: number;
  icon: LucideIcon;
  tone: keyof typeof metricStyles;
  detail: string;
  positive?: boolean;
}) {
  const styles = metricStyles[tone];
  const DetailIcon = positive ? TrendingUp : Minus;

  return (
    <article className="rounded-lg border border-line bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex items-start gap-4">
        <span className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-lg", styles.icon)}>
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="whitespace-nowrap text-sm font-semibold text-ink">{title}</p>
          <p className={cn("mt-3 text-4xl font-extrabold leading-none", styles.value)}>{value}</p>
          <p className={cn("mt-4 inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold", positive ? styles.trend : "text-muted")}>
            <DetailIcon className="h-3.5 w-3.5" />
            {detail}
          </p>
        </div>
      </div>
    </article>
  );
}

function WidgetHeader({ title, href, linkLabel = "View all" }: { title: string; href: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
      <h2 className="text-base font-extrabold text-ink">{title}</h2>
      <Link href={href} className="inline-flex min-h-10 items-center gap-1 text-sm font-bold text-primary-700 hover:text-primary-800">
        {linkLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function CompactLink({ href, children, primary = false }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-8 items-center justify-center rounded-md px-2.5 text-xs font-bold transition",
        primary ? "bg-primary-700 text-white hover:bg-primary-800" : "border border-line bg-white text-ink hover:bg-primary-50"
      )}
    >
      {children}
    </Link>
  );
}

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
      if (inq.error) setError(getSafeErrorMessage("load inquiries"));
      if (quote.error) setError(getSafeErrorMessage("load quotations"));
      if (schedule.error) setError(getSafeErrorMessage("load service schedules"));
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
  const recentInquiries = priorityInquiries.slice(0, 5);
  const dueSchedules = schedules
    .filter((schedule) => ["today", "upcoming", "overdue"].includes(getScheduleWindow(schedule)))
    .sort((a, b) => {
      const priority = { overdue: 0, today: 1, upcoming: 2, later: 3 };
      const priorityDiff = priority[getScheduleWindow(a)] - priority[getScheduleWindow(b)];
      if (priorityDiff !== 0) return priorityDiff;
      return `${a.next_service_date}T${a.scheduled_time ?? "00:00"}`.localeCompare(`${b.next_service_date}T${b.scheduled_time ?? "00:00"}`);
    });
  const metricCards = [
    { title: "New Inquiries", value: inquiries.filter((inq) => inq.status === "New").length, icon: Inbox, tone: "blue" as const, detail: "Open intake", positive: true },
    { title: "Pending Quotes", value: pending, icon: ClipboardList, tone: "amber" as const, detail: "Awaiting approval" },
    { title: "Approved Quotes", value: approved, icon: CheckCircle2, tone: "green" as const, detail: "Ready to schedule" },
    { title: "Completed Jobs", value: completed, icon: ReceiptText, tone: "gray" as const, detail: "Closed jobs", positive: true }
  ];
  const activityItems = quotations.slice(0, 5).map((quote) => ({
    id: quote.id,
    title: quote.quotation_number,
    description: `${quote.customer_name} - ${quote.status}`,
    date: formatDate(quote.created_at),
    tone: quote.status === "Approved" || quote.status === "Completed" ? "bg-emerald-600" : quote.status === "Sent" ? "bg-primary-700" : "bg-amber-500"
  }));

  async function updateSchedule(schedule: Schedule, patch: Partial<Schedule>) {
    const supabase = createClient();
    const { error: updateError } = await (supabase as any).from("service_schedules").update(patch).eq("id", schedule.id);
    if (updateError) setError(getSafeErrorMessage("update the service schedule"));
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
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/customers"><Button variant="outline" className="shadow-sm"><UserRound className="h-4 w-4" /> New Customer</Button></Link>
            <Link href="/admin/quotation-builder"><Button variant="outline" className="shadow-sm"><FileText className="h-4 w-4" /> Create Quotation</Button></Link>
            <Link href="/admin/inquiries"><Button className="shadow-sm"><Bell className="h-4 w-4" /> New Inquiry</Button></Link>
          </div>
        }
      />
      {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-danger">{error}</div> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>
      <div className="mt-6 grid gap-5">
        <div className="admin-panel overflow-hidden">
          <WidgetHeader title="Recent Inquiries" href="/admin/inquiries" />
          {recentInquiries.length ? (
            <>
              <div className="hidden lg:block">
                <table className="w-full table-fixed border-collapse text-left">
                  <colgroup>
                    <col className="w-[14%]" />
                    <col className="w-[16%]" />
                    <col className="w-[12%]" />
                    <col className="w-[19%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                    <col className="w-[15%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-line bg-slate-50/80 text-xs font-extrabold text-muted">
                      <th className="px-4 py-3">Inquiry ID</th>
                      <th className="px-3 py-3">Customer</th>
                      <th className="px-3 py-3">Service</th>
                      <th className="px-3 py-3">Tags</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-sm">
                    {recentInquiries.map((inquiry) => (
                      <tr key={inquiry.id} className={cn("bg-white transition hover:bg-primary-50/50", inquiry.status === "New" && "bg-primary-50/30")}>
                        <td className="px-4 py-4 align-middle">
                          <Link href={`/admin/inquiries?focus=${inquiry.id}`} className="font-extrabold text-primary-700 hover:text-primary-800">
                            {inquiry.reference_number}
                          </Link>
                        </td>
                        <td className="px-3 py-4 align-middle">
                          <Link
                            href={inquiry.customer_id ? `/admin/customers/${inquiry.customer_id}` : `/admin/customers?phone=${encodeURIComponent(inquiry.contact_number)}`}
                            className="break-words font-semibold text-ink hover:text-primary-700"
                          >
                            {inquiry.customer_name}
                          </Link>
                        </td>
                        <td className="px-3 py-4 align-middle text-muted">{inquiry.service_type}</td>
                        <td className="px-3 py-4 align-middle">
                          <CustomerBadges badges={badgesForInquiry(inquiry, inquiries, quotations, schedules)} />
                        </td>
                        <td className="px-3 py-4 align-middle">
                          <StatusBadge value={inquiry.status} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 align-middle text-muted">{formatDate(inquiry.created_at)}</td>
                        <td className="px-4 py-4 align-middle">
                          <div className="flex items-center justify-end gap-1.5">
                            <CompactLink href={`/admin/inquiries?focus=${inquiry.id}`}>
                              View
                            </CompactLink>
                            <CompactLink href={`/admin/quotation-builder?inquiry=${inquiry.id}`} primary>
                              Quote
                            </CompactLink>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-line lg:hidden">
                {recentInquiries.map((inquiry) => (
                  <article key={inquiry.id} className="grid gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/admin/inquiries?focus=${inquiry.id}`} className="font-extrabold text-primary-700">
                          {inquiry.reference_number}
                        </Link>
                        <p className="mt-1 font-semibold text-ink">{inquiry.customer_name}</p>
                        <p className="text-sm text-muted">{inquiry.service_type}</p>
                      </div>
                      <StatusBadge value={inquiry.status} />
                    </div>
                    <CustomerBadges badges={badgesForInquiry(inquiry, inquiries, quotations, schedules)} />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm text-muted">{formatDate(inquiry.created_at)}</span>
                      <span className="flex flex-wrap gap-2">
                        <CompactLink href={`/admin/inquiries?focus=${inquiry.id}`}>View</CompactLink>
                        <CompactLink href={inquiry.customer_id ? `/admin/customers/${inquiry.customer_id}` : `/admin/customers?phone=${encodeURIComponent(inquiry.contact_number)}`}>Customer</CompactLink>
                        <CompactLink href={`/admin/quotation-builder?inquiry=${inquiry.id}`} primary>Quote</CompactLink>
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <p className="p-5 text-sm text-muted">No inquiries yet.</p>
          )}
          <div className="flex items-center justify-between border-t border-line px-5 py-4 text-xs font-semibold text-muted">
            <span>Showing {recentInquiries.length ? `1 to ${recentInquiries.length}` : "0"} of {inquiries.length} results</span>
          </div>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="admin-panel overflow-hidden">
            <WidgetHeader title="Upcoming Services" href="/admin/service-schedule" />
            <div className="grid gap-1 p-4">
              {dueSchedules.slice(0, 5).map((schedule) => (
                <div key={schedule.id} className="rounded-lg px-3 py-3 transition hover:bg-slate-50">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-100 text-primary-700">
                      <CalendarDays className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-ink">{customers.find((customer) => customer.id === schedule.customer_id)?.name ?? "Customer"}</p>
                          <p className="mt-0.5 text-sm text-muted">{schedule.service_type}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-extrabold text-primary-700">{formatDate(schedule.next_service_date)}</p>
                          <p className="mt-0.5 text-xs font-semibold text-muted">{formatScheduleTime(schedule.scheduled_time)}</p>
                          <StatusBadge value={scheduleWindowLabel(getScheduleWindow(schedule))} className="mt-2" />
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <CompactLink href={`/admin/customers/${schedule.customer_id}`}>Customer</CompactLink>
                        <CompactLink href={`/admin/quotation-builder?customer=${schedule.customer_id}`}>Quote</CompactLink>
                        <Button size="sm" variant="success" className="min-h-9 px-3 text-xs" onClick={() => markCompleted(schedule)}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Done
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {!dueSchedules.length ? <p className="px-3 py-4 text-sm text-muted">No due or overdue services.</p> : null}
            </div>
          </div>
          <div className="admin-panel overflow-hidden">
            <WidgetHeader title="Activity Feed" href="/admin/quotations" linkLabel="View full activity" />
            <div className="grid gap-1 p-4">
              {activityItems.map((item) => (
                <div key={item.id} className="relative grid grid-cols-[1.5rem_minmax(0,1fr)_auto] gap-3 rounded-lg px-2 py-3">
                  <span className="absolute bottom-0 left-[1.18rem] top-8 w-px bg-line" aria-hidden="true" />
                  <span className={cn("relative z-10 mt-1 h-3 w-3 rounded-full ring-4 ring-white", item.tone)} />
                  <div className="min-w-0">
                    <p className="font-bold text-ink">{item.title}</p>
                    <p className="mt-0.5 text-sm text-muted">{item.description}</p>
                  </div>
                  <span className="whitespace-nowrap text-xs font-semibold text-muted">{item.date}</span>
                </div>
              ))}
              {!activityItems.length ? <p className="px-2 py-4 text-sm text-muted">No quotation activity yet.</p> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
