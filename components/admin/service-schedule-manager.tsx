"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  MoreVertical,
  Pause,
  Phone,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  UserRound,
  X,
  XCircle
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { AdminPageHeader } from "./admin-page-header";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { recurrenceTypes, serviceTypes } from "@/lib/constants";
import type { Database } from "@/lib/database.types";
import { getSafeErrorMessage } from "@/lib/security";
import { createClient } from "@/lib/supabase/client";
import { serviceScheduleSchema } from "@/lib/validation";
import { cn, formatDate } from "@/lib/utils";
import { formatDateInput, getScheduleWindow, nextServiceDateFrom, recurrenceLabels } from "@/lib/service-workflow";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Inquiry = Database["public"]["Tables"]["inquiries"]["Row"];
type Quotation = Database["public"]["Tables"]["quotations"]["Row"];
type Schedule = Database["public"]["Tables"]["service_schedules"]["Row"];
type InputValues = z.input<typeof serviceScheduleSchema>;
type Values = z.output<typeof serviceScheduleSchema>;
type SummaryKey = "overdue" | "today" | "week" | "monthly" | "all";

const emptyScheduleValues = {
  customer_id: "",
  inquiry_id: "",
  quotation_id: "",
  service_type: "Aircon Cleaning",
  recurrence_type: "monthly",
  start_date: formatDateInput(new Date()),
  next_service_date: formatDateInput(new Date()),
  status: "active",
  assigned_technician: "",
  notes: ""
} satisfies InputValues;

const statusOptions = ["active", "paused", "completed", "cancelled"] as const;

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function dateValue(value: string | null | undefined) {
  return value ? new Date(`${value}T00:00:00`).getTime() : 0;
}

function scheduleStatusLabel(schedule: Schedule) {
  const window = getScheduleWindow(schedule);
  if (window === "overdue") return "Overdue";
  if (schedule.status === "active" && window === "later") return "Scheduled";
  if (schedule.status === "active") return "Active";
  if (schedule.status === "paused") return "Paused";
  if (schedule.status === "completed") return "Completed";
  if (schedule.status === "cancelled") return "Cancelled";
  return schedule.status;
}

export function ServiceScheduleManager() {
  const params = useSearchParams();
  const focusedScheduleId = params.get("focus");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [open, setOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState<Schedule | null>(null);
  const [nextDate, setNextDate] = useState(formatDateInput(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [activeSummary, setActiveSummary] = useState<SummaryKey>("monthly");
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [technicianFilter, setTechnicianFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<InputValues, unknown, Values>({
    resolver: zodResolver(serviceScheduleSchema),
    defaultValues: emptyScheduleValues
  });

  async function load() {
    const supabase = createClient();
    const [customerResult, inquiryResult, quoteResult, scheduleResult] = await Promise.all([
      supabase.from("customers").select("*").order("name"),
      supabase.from("inquiries").select("*").order("created_at", { ascending: false }),
      supabase.from("quotations").select("*").order("created_at", { ascending: false }),
      supabase.from("service_schedules").select("*").order("next_service_date", { ascending: true })
    ]);

    if (customerResult.error) setError(getSafeErrorMessage("load customers"));
    if (scheduleResult.error) setError(getSafeErrorMessage("load service schedules"));
    setCustomers((customerResult.data ?? []) as Customer[]);
    setInquiries((inquiryResult.data ?? []) as Inquiry[]);
    setQuotations((quoteResult.data ?? []) as Quotation[]);
    setSchedules((scheduleResult.data ?? []) as Schedule[]);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const customerId = params.get("customer");
    const inquiryId = params.get("inquiry");
    const quotationId = params.get("quotation");
    if (!customers.length || (!customerId && !inquiryId && !quotationId)) return;

    const linkedInquiry = inquiries.find((inquiry) => inquiry.id === inquiryId);
    const linkedQuotation = quotations.find((quote) => quote.id === quotationId);
    const matchedInquiryCustomer = linkedInquiry
      ? customers.find((customer) => customer.contact_number.replace(/\D/g, "") === linkedInquiry.contact_number.replace(/\D/g, ""))
      : null;
    const resolvedCustomerId = customerId || linkedInquiry?.customer_id || linkedQuotation?.customer_id || matchedInquiryCustomer?.id || "";

    reset({
      ...emptyScheduleValues,
      customer_id: resolvedCustomerId,
      inquiry_id: linkedInquiry?.id ?? "",
      quotation_id: linkedQuotation?.id ?? "",
      service_type: linkedInquiry?.service_type ?? "Aircon Cleaning"
    });
    setOpen(true);
  }, [customers, inquiries, quotations, params, reset]);

  useEffect(() => {
    if (focusedScheduleId) setSelectedScheduleId(focusedScheduleId);
  }, [focusedScheduleId]);

  const customerById = useMemo(() => new Map(customers.map((customer) => [customer.id, customer])), [customers]);
  const selectedCustomerId = watch("customer_id");
  const customerInquiries = useMemo(() => inquiries.filter((inquiry) => inquiry.customer_id === selectedCustomerId), [inquiries, selectedCustomerId]);
  const customerQuotations = useMemo(() => quotations.filter((quote) => quote.customer_id === selectedCustomerId), [quotations, selectedCustomerId]);

  const sections = useMemo(() => {
    const active = schedules.filter((schedule) => schedule.status === "active");
    return {
      today: active.filter((schedule) => getScheduleWindow(schedule) === "today"),
      week: active.filter((schedule) => getScheduleWindow(schedule) === "upcoming"),
      monthly: active.filter((schedule) => schedule.recurrence_type === "monthly"),
      overdue: active.filter((schedule) => getScheduleWindow(schedule) === "overdue"),
      all: schedules
    };
  }, [schedules]);

  const technicians = useMemo(() => {
    return Array.from(new Set(schedules.map((schedule) => schedule.assigned_technician).filter(Boolean) as string[])).sort();
  }, [schedules]);

  const selectedSchedule = useMemo(() => {
    if (!selectedScheduleId) return null;
    return schedules.find((schedule) => schedule.id === selectedScheduleId) ?? null;
  }, [schedules, selectedScheduleId]);

  const filteredSchedules = useMemo(() => {
    const base = activeSummary === "all" ? schedules : sections[activeSummary];
    const query = normalize(searchTerm);
    const start = dateFrom ? dateValue(dateFrom) : null;
    const end = dateTo ? dateValue(dateTo) : null;

    return [...base]
      .filter((schedule) => {
        const customer = customerById.get(schedule.customer_id);
        const haystack = normalize(`${customer?.name ?? ""} ${customer?.address ?? ""} ${customer?.contact_number ?? ""} ${schedule.service_type} ${schedule.assigned_technician ?? ""}`);
        const nextDate = dateValue(schedule.next_service_date);
        return (
          (!query || haystack.includes(query)) &&
          (serviceFilter === "all" || schedule.service_type === serviceFilter) &&
          (technicianFilter === "all" || (technicianFilter === "unassigned" ? !schedule.assigned_technician : schedule.assigned_technician === technicianFilter)) &&
          (statusFilter === "all" || schedule.status === statusFilter || scheduleStatusLabel(schedule).toLowerCase() === statusFilter) &&
          (start === null || nextDate >= start) &&
          (end === null || nextDate <= end)
        );
      })
      .sort((a, b) => dateValue(a.next_service_date) - dateValue(b.next_service_date));
  }, [activeSummary, customerById, dateFrom, dateTo, schedules, searchTerm, sections, serviceFilter, statusFilter, technicianFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredSchedules.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = filteredSchedules.length ? (currentPage - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(currentPage * pageSize, filteredSchedules.length);
  const pagedSchedules = filteredSchedules.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [activeSummary, searchTerm, serviceFilter, technicianFilter, statusFilter, dateFrom, dateTo, pageSize]);

  function customerFor(schedule: Schedule) {
    return customerById.get(schedule.customer_id);
  }

  function startCreate() {
    setError(null);
    setSuccess(null);
    reset(emptyScheduleValues);
    setOpen(true);
  }

  async function onSubmit(values: Values) {
    setError(null);
    setSuccess(null);
    const supabase = createClient();
    const { error: insertError } = await (supabase as any).from("service_schedules").insert({
      customer_id: values.customer_id,
      inquiry_id: values.inquiry_id || null,
      quotation_id: values.quotation_id || null,
      service_type: values.service_type,
      recurrence_type: values.recurrence_type,
      start_date: values.start_date,
      next_service_date: values.next_service_date,
      status: values.status,
      assigned_technician: values.assigned_technician || null,
      notes: values.notes || null
    });

    if (insertError) {
      setError(getSafeErrorMessage("create the service schedule"));
      return;
    }
    setOpen(false);
    setSuccess("Service schedule created.");
    await load();
  }

  async function clearScheduleNotifications(scheduleId: string) {
    const supabase = createClient();
    await (supabase as any).from("notifications").update({ is_read: true }).eq("related_schedule_id", scheduleId);
  }

  async function updateSchedule(schedule: Schedule, patch: Partial<Schedule>, successMessage: string, actionKey: string) {
    setError(null);
    setSuccess(null);
    setBusyAction(actionKey);
    const supabase = createClient();
    const { error: updateError } = await (supabase as any).from("service_schedules").update(patch).eq("id", schedule.id);
    if (updateError) {
      setError(getSafeErrorMessage("update the service schedule"));
      setBusyAction(null);
      return;
    }
    if (patch.status && patch.status !== "active") await clearScheduleNotifications(schedule.id);
    if (patch.next_service_date) await clearScheduleNotifications(schedule.id);
    setSuccess(successMessage);
    await load();
    setBusyAction(null);
  }

  async function markCompleted(schedule: Schedule) {
    const completedDate = new Date();
    const patch: Partial<Schedule> = {
      last_service_date: formatDateInput(completedDate),
      status: schedule.recurrence_type === "none" ? "completed" : "active",
      next_service_date: schedule.recurrence_type === "none" ? schedule.next_service_date : nextServiceDateFrom(schedule.recurrence_type, completedDate)
    };
    await clearScheduleNotifications(schedule.id);
    await updateSchedule(schedule, patch, schedule.recurrence_type === "none" ? "Service marked completed." : "Service completed and next date updated.", `complete-${schedule.id}`);
  }

  function startReschedule(schedule: Schedule) {
    setOpenMenuId(null);
    setRescheduling(schedule);
    setNextDate(schedule.next_service_date);
  }

  async function saveReschedule() {
    if (!rescheduling) return;
    await updateSchedule(rescheduling, { next_service_date: nextDate, status: "active" }, "Service rescheduled.", `reschedule-${rescheduling.id}`);
    setRescheduling(null);
  }

  async function cancelSchedule(schedule: Schedule) {
    setOpenMenuId(null);
    const confirmed = window.confirm("Cancel this service schedule? It will be removed from active reminders.");
    if (!confirmed) return;
    await updateSchedule(schedule, { status: "cancelled" }, "Service schedule cancelled.", `cancel-${schedule.id}`);
  }

  function openDetails(schedule: Schedule) {
    setSelectedScheduleId(schedule.id);
    setOpenMenuId(null);
    setMenuPosition(null);
  }

  function toggleActionMenu(schedule: Schedule, event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (openMenuId === schedule.id) {
      setOpenMenuId(null);
      setMenuPosition(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 224;
    const menuHeight = 236;
    setOpenMenuId(schedule.id);
    setMenuPosition({
      top: Math.min(rect.bottom + 8, window.innerHeight - menuHeight - 12),
      left: Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12))
    });
  }

  const summaryCards: Array<{ key: SummaryKey; label: string; count: number; icon: typeof AlertTriangle; tone: string }> = [
    { key: "overdue", label: "Overdue", count: sections.overdue.length, icon: AlertTriangle, tone: "bg-red-50 text-red-700 ring-red-100" },
    { key: "today", label: "Today", count: sections.today.length, icon: CalendarDays, tone: "bg-primary-50 text-primary-700 ring-primary-100" },
    { key: "week", label: "This Week", count: sections.week.length, icon: CalendarClock, tone: "bg-purple-50 text-purple-700 ring-purple-100" },
    { key: "monthly", label: "Monthly", count: sections.monthly.length, icon: CalendarCheck, tone: "bg-sky-50 text-primary-700 ring-primary-100" },
    { key: "all", label: "All", count: sections.all.length, icon: ClipboardList, tone: "bg-slate-100 text-slate-700 ring-slate-200" }
  ];
  const menuSchedule = openMenuId ? schedules.find((schedule) => schedule.id === openMenuId) ?? null : null;

  return (
    <section>
      <AdminPageHeader
        title="Service Schedule"
        description="Track today, upcoming, monthly, and overdue service work."
        action={<Button onClick={startCreate} className="min-h-10 px-4"><Plus className="h-4 w-4" /> New service schedule</Button>}
      />

      {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-danger">{error}</div> : null}
      {success ? <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-success">{success}</div> : null}

      <div className={cn("grid gap-5", selectedSchedule ? "xl:pr-[24rem]" : "")}>
        <div className="min-w-0">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              const active = activeSummary === card.key;
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => setActiveSummary(card.key)}
                  className={cn(
                    "focus-ring flex min-h-[88px] items-center gap-4 rounded-lg border bg-white px-4 py-3 text-left shadow-panel transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-soft",
                    active ? "border-primary-600 bg-primary-50/70 ring-1 ring-primary-200" : "border-line"
                  )}
                  aria-pressed={active}
                >
                  <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg ring-1", card.tone)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className={cn("block text-sm font-bold", active ? "text-primary-800" : "text-ink")}>{card.label}</span>
                    <span className="mt-1 block text-2xl font-extrabold leading-none text-ink">{card.count}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 admin-panel p-4">
            <div className="grid gap-3">
              <label className="block max-w-md text-sm font-semibold text-ink">
                <span className="sr-only">Search schedules</span>
                <span className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search customer, address, or phone..."
                    className="focus-ring min-h-11 w-full rounded-md border border-line bg-white py-2 pl-10 pr-3 text-sm text-ink placeholder:text-slate-400"
                  />
                </span>
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <label className="relative flex min-h-11 w-full min-w-0 items-center rounded-md border border-line bg-white text-sm font-semibold text-ink sm:w-[12rem]">
                  <span className="shrink-0 border-r border-line px-3 text-xs text-muted">Service type</span>
                  <select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)} className="focus-ring min-h-11 min-w-0 flex-1 border-0 bg-transparent text-sm text-ink">
                    <option value="all">All</option>
                    {serviceTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>

                <label className="relative flex min-h-11 w-full min-w-0 items-center rounded-md border border-line bg-white text-sm font-semibold text-ink sm:w-[12rem]">
                  <span className="shrink-0 border-r border-line px-3 text-xs text-muted">Technician</span>
                  <select value={technicianFilter} onChange={(event) => setTechnicianFilter(event.target.value)} className="focus-ring min-h-11 min-w-0 flex-1 border-0 bg-transparent text-sm text-ink">
                    <option value="all">All</option>
                    <option value="unassigned">Not assigned</option>
                    {technicians.map((technician) => <option key={technician} value={technician}>{technician}</option>)}
                  </select>
                </label>

                <label className="relative flex min-h-11 w-full min-w-0 items-center rounded-md border border-line bg-white text-sm font-semibold text-ink sm:w-[11rem]">
                  <span className="shrink-0 border-r border-line px-3 text-xs text-muted">Status</span>
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="focus-ring min-h-11 min-w-0 flex-1 border-0 bg-transparent text-sm text-ink">
                    <option value="all">All</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="overdue">Overdue</option>
                    {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>

                <div className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink sm:w-[18.5rem]">
                  <CalendarDays className="h-4 w-4 shrink-0 text-muted" />
                  <input aria-label="Date from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="focus-ring min-h-9 min-w-0 flex-1 rounded border-0 bg-transparent px-0 text-sm text-ink" />
                  <span className="text-muted">-</span>
                  <input aria-label="Date to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="focus-ring min-h-9 min-w-0 flex-1 rounded border-0 bg-transparent px-0 text-sm text-ink" />
                </div>

              </div>
            </div>
          </div>

          <div className="mt-5 overflow-visible rounded-lg border border-line bg-white shadow-panel">
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[820px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line bg-slate-50 text-sm text-ink">
                    <th className="px-4 py-3 font-extrabold">Customer</th>
                    <th className="px-4 py-3 font-extrabold">Service</th>
                    <th className="px-4 py-3 font-extrabold">Recurrence</th>
                    <th className="px-4 py-3 font-extrabold">Next Service Date</th>
                    <th className="px-4 py-3 font-extrabold">Technician</th>
                    <th className="px-4 py-3 font-extrabold">Status</th>
                    <th className="px-4 py-3 text-right font-extrabold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-sm">
                  {pagedSchedules.map((schedule) => {
                    const customer = customerFor(schedule);
                    const selected = selectedScheduleId === schedule.id || focusedScheduleId === schedule.id;
                    return (
                      <tr
                        key={schedule.id}
                        onClick={() => openDetails(schedule)}
                        className={cn(
                          "cursor-pointer bg-white transition hover:bg-primary-50/70",
                          selected && "bg-primary-50/80 shadow-[inset_3px_0_0_#007dc2]"
                        )}
                      >
                        <td className="px-4 py-3 align-middle">
                          <div className="font-bold text-primary-800">{customer?.name ?? "Unknown customer"}</div>
                          <div className="mt-0.5 text-sm text-muted">{customer?.contact_number ?? "No contact number"}</div>
                        </td>
                        <td className="px-4 py-3 align-middle text-ink">{schedule.service_type}</td>
                        <td className="px-4 py-3 align-middle text-muted">{recurrenceLabels[schedule.recurrence_type]}</td>
                        <td className="px-4 py-3 align-middle font-semibold text-ink">{formatDate(schedule.next_service_date)}</td>
                        <td className="px-4 py-3 align-middle text-muted">{schedule.assigned_technician || "Not assigned"}</td>
                        <td className="px-4 py-3 align-middle"><StatusBadge value={scheduleStatusLabel(schedule)} /></td>
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                            <button type="button" onClick={() => openDetails(schedule)} className="focus-ring inline-flex min-h-9 items-center rounded-md border border-line bg-white px-3 text-sm font-bold text-ink transition hover:bg-primary-50">
                              View
                            </button>
                            <button
                              type="button"
                              disabled={busyAction !== null || schedule.status === "completed" || schedule.status === "cancelled"}
                              onClick={() => markCompleted(schedule)}
                              className="focus-ring grid h-9 w-9 place-items-center rounded-md bg-success text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-55"
                              aria-label="Mark completed"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(event) => toggleActionMenu(schedule, event)}
                                className={cn(
                                  "focus-ring grid h-9 w-9 place-items-center rounded-md text-muted transition hover:bg-slate-100 hover:text-ink",
                                  openMenuId === schedule.id && "bg-slate-100 text-ink"
                                )}
                                aria-label="More actions"
                              >
                                <MoreVertical className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-3 lg:hidden">
              {pagedSchedules.map((schedule) => {
                const customer = customerFor(schedule);
                const selected = selectedScheduleId === schedule.id || focusedScheduleId === schedule.id;
                return (
                  <article key={schedule.id} className={cn("rounded-lg border bg-white p-4 shadow-panel", selected ? "border-primary-500 ring-1 ring-primary-200" : "border-line")}>
                    <button type="button" onClick={() => openDetails(schedule)} className="block w-full text-left">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="break-words font-bold text-primary-800">{customer?.name ?? "Unknown customer"}</h3>
                          <p className="mt-1 text-sm text-muted">{customer?.contact_number ?? "No contact number"}</p>
                        </div>
                        <StatusBadge value={scheduleStatusLabel(schedule)} className="shrink-0" />
                      </div>
                      <div className="mt-3 grid gap-1 text-sm text-muted">
                        <span><strong className="text-ink">Service:</strong> {schedule.service_type}</span>
                        <span><strong className="text-ink">Next:</strong> {formatDate(schedule.next_service_date)}</span>
                        <span><strong className="text-ink">Technician:</strong> {schedule.assigned_technician || "Not assigned"}</span>
                      </div>
                    </button>
                    <div className="mt-4 flex items-center gap-2">
                      <button type="button" onClick={() => openDetails(schedule)} className="focus-ring inline-flex min-h-9 items-center rounded-md border border-line bg-white px-3 text-sm font-bold text-ink">View</button>
                      <button type="button" disabled={busyAction !== null || schedule.status === "completed" || schedule.status === "cancelled"} onClick={() => markCompleted(schedule)} className="focus-ring grid h-9 w-9 place-items-center rounded-md bg-success text-white disabled:opacity-55" aria-label="Mark completed"><CheckCircle2 className="h-4 w-4" /></button>
                      <button type="button" onClick={(event) => toggleActionMenu(schedule, event)} className={cn("focus-ring grid h-9 w-9 place-items-center rounded-md border border-line text-muted", openMenuId === schedule.id && "bg-slate-100 text-ink")} aria-label="More actions"><MoreVertical className="h-5 w-5" /></button>
                    </div>
                  </article>
                );
              })}
            </div>

            {!pagedSchedules.length ? (
              <div className="flex min-h-32 items-center justify-center border-t border-line px-5 py-8 text-center text-sm font-semibold text-muted">
                {activeSummary === "overdue" ? "No overdue services found." : "No schedules match your filters."}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-line px-4 py-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
              <span>{filteredSchedules.length ? `Showing ${pageStart}-${pageEnd} of ${filteredSchedules.length} schedules` : "Showing 0 schedules"}</span>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="focus-ring grid h-9 w-9 place-items-center rounded-md border border-line bg-white text-ink disabled:opacity-45" aria-label="Previous page">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(pageCount, 4) }, (_, index) => index + 1).map((number) => (
                  <button key={number} type="button" onClick={() => setPage(number)} className={cn("focus-ring grid h-9 w-9 place-items-center rounded-md border text-sm font-bold", currentPage === number ? "border-primary-600 bg-primary-50 text-primary-800" : "border-line bg-white text-ink")}>
                    {number}
                  </button>
                ))}
                {pageCount > 4 ? <span className="px-1 font-bold text-muted">...</span> : null}
                {pageCount > 4 ? (
                  <button type="button" onClick={() => setPage(pageCount)} className={cn("focus-ring grid h-9 w-9 place-items-center rounded-md border text-sm font-bold", currentPage === pageCount ? "border-primary-600 bg-primary-50 text-primary-800" : "border-line bg-white text-ink")}>
                    {pageCount}
                  </button>
                ) : null}
                <button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage === pageCount} className="focus-ring grid h-9 w-9 place-items-center rounded-md border border-line bg-white text-ink disabled:opacity-45" aria-label="Next page">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="focus-ring h-9 rounded-md border-line bg-white text-sm font-semibold text-ink">
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {selectedSchedule ? (
          <ScheduleDrawer
            schedule={selectedSchedule}
            customer={customerFor(selectedSchedule)}
            busyAction={busyAction}
            onClose={() => setSelectedScheduleId(null)}
            onMarkScheduled={() => updateSchedule(selectedSchedule, { status: "active" }, "Service marked as scheduled.", `schedule-${selectedSchedule.id}`)}
            onMarkCompleted={() => markCompleted(selectedSchedule)}
            onReschedule={() => startReschedule(selectedSchedule)}
            onPause={() => updateSchedule(selectedSchedule, { status: "paused" }, "Service schedule paused.", `pause-${selectedSchedule.id}`)}
            onCancel={() => cancelSchedule(selectedSchedule)}
          />
        ) : null}

        {menuSchedule && menuPosition ? (
          <ActionMenu
            schedule={menuSchedule}
            position={menuPosition}
            busyAction={busyAction}
            onClose={() => {
              setOpenMenuId(null);
              setMenuPosition(null);
            }}
            onMarkScheduled={() => updateSchedule(menuSchedule, { status: "active" }, "Service marked as scheduled.", `schedule-${menuSchedule.id}`)}
            onReschedule={() => startReschedule(menuSchedule)}
            onPause={() => updateSchedule(menuSchedule, { status: "paused" }, "Service schedule paused.", `pause-${menuSchedule.id}`)}
            onCancel={() => cancelSchedule(menuSchedule)}
          />
        ) : null}
      </div>

      <Modal title="Create service schedule" open={open} onClose={() => setOpen(false)}>
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <Select label="Customer" {...register("customer_id")} error={errors.customer_id?.message} onChange={(event) => {
            setValue("customer_id", event.target.value);
            setValue("inquiry_id", "");
            setValue("quotation_id", "");
          }}>
            <option value="">Select customer</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} - {customer.contact_number}</option>)}
          </Select>
          <div className="grid gap-4 md:grid-cols-2">
            <Select label="Related inquiry optional" {...register("inquiry_id")}>
              <option value="">No inquiry</option>
              {customerInquiries.map((inquiry) => <option key={inquiry.id} value={inquiry.id}>{inquiry.reference_number} - {inquiry.service_type}</option>)}
            </Select>
            <Select label="Related quotation optional" {...register("quotation_id")}>
              <option value="">No quotation</option>
              {customerQuotations.map((quote) => <option key={quote.id} value={quote.id}>{quote.quotation_number}</option>)}
            </Select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Select label="Service type" {...register("service_type")}>{serviceTypes.map((type) => <option key={type}>{type}</option>)}</Select>
            <Select label="Recurrence" {...register("recurrence_type")}>{recurrenceTypes.map((type) => <option key={type} value={type}>{recurrenceLabels[type]}</option>)}</Select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Start date" type="date" {...register("start_date")} error={errors.start_date?.message} />
            <Input label="Next service date" type="date" {...register("next_service_date")} error={errors.next_service_date?.message} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Select label="Status" {...register("status")} error={errors.status?.message}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
            <Input label="Assigned technician optional" {...register("assigned_technician")} />
          </div>
          <Textarea label="Notes" {...register("notes")} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save schedule"}</Button>
          </div>
        </form>
      </Modal>

      <Modal title="Reschedule service" open={Boolean(rescheduling)} onClose={() => setRescheduling(null)}>
        <div className="grid gap-4">
          <Input label="Next service date" type="date" value={nextDate} onChange={(event) => setNextDate(event.target.value)} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setRescheduling(null)}>Cancel</Button>
            <Button onClick={saveReschedule}>Save date</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

function ActionMenu({
  schedule,
  position,
  busyAction,
  onClose,
  onMarkScheduled,
  onReschedule,
  onPause,
  onCancel
}: {
  schedule: Schedule;
  position: { top: number; left: number };
  busyAction: string | null;
  onClose: () => void;
  onMarkScheduled: () => void;
  onReschedule: () => void;
  onPause: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <button type="button" className="fixed inset-0 z-[70] cursor-default bg-transparent" onClick={onClose} aria-label="Close actions menu" />
      <div
        className="fixed z-[80] w-56 rounded-lg border border-line bg-white p-1.5 text-sm shadow-soft"
        style={{ top: position.top, left: position.left }}
      >
        <Link href={`/admin/quotation-builder?customer=${schedule.customer_id}&service=${encodeURIComponent(schedule.service_type)}`} className="flex items-center gap-2 rounded-md px-3 py-2 font-semibold text-ink hover:bg-primary-50" onClick={onClose}>
          <ClipboardList className="h-4 w-4" /> Create Quotation
        </Link>
        <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left font-semibold text-ink hover:bg-primary-50 disabled:opacity-50" onClick={onMarkScheduled} disabled={busyAction !== null || schedule.status === "active"}>
          <CalendarClock className="h-4 w-4" /> Mark as Scheduled
        </button>
        <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left font-semibold text-ink hover:bg-primary-50 disabled:opacity-50" onClick={onReschedule} disabled={busyAction !== null || schedule.status === "cancelled"}>
          <RotateCcw className="h-4 w-4" /> Reschedule
        </button>
        <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left font-semibold text-ink hover:bg-primary-50 disabled:opacity-50" onClick={onPause} disabled={busyAction !== null || schedule.status === "paused" || schedule.status === "cancelled"}>
          <Pause className="h-4 w-4" /> Pause Schedule
        </button>
        <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left font-semibold text-danger hover:bg-red-50 disabled:opacity-50" onClick={onCancel} disabled={busyAction !== null || schedule.status === "cancelled"}>
          <XCircle className="h-4 w-4" /> Cancel Schedule
        </button>
      </div>
    </>
  );
}

function ScheduleDrawer({
  schedule,
  customer,
  busyAction,
  onClose,
  onMarkScheduled,
  onMarkCompleted,
  onReschedule,
  onPause,
  onCancel
}: {
  schedule: Schedule;
  customer?: Customer;
  busyAction: string | null;
  onClose: () => void;
  onMarkScheduled: () => void;
  onMarkCompleted: () => void;
  onReschedule: () => void;
  onPause: () => void;
  onCancel: () => void;
}) {
  return (
    <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-white shadow-soft lg:top-16 lg:w-[23rem]">
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-5">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-extrabold text-ink">{customer?.name ?? "Unknown customer"}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StatusBadge value={scheduleStatusLabel(schedule)} />
            <div className="text-right text-sm">
              <div className="font-extrabold text-primary-800">{formatDate(schedule.next_service_date)}</div>
              <div className="text-xs font-semibold text-muted">Next Service Date</div>
            </div>
          </div>
        </div>
        <button type="button" onClick={onClose} className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-md text-muted hover:bg-slate-100 hover:text-ink" aria-label="Close details">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <section className="border-b border-line pb-5">
          <h3 className="text-sm font-extrabold text-ink">Customer</h3>
          <div className="mt-3 grid gap-3 text-sm text-muted">
            <div className="flex gap-3"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted" /><span>{customer?.contact_number ?? "No contact number"}</span></div>
            <div className="flex gap-3"><UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted" /><span>{customer?.address ?? "No address"}</span></div>
          </div>
          <Link href={`/admin/customers/${schedule.customer_id}`} className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-bold text-ink transition hover:bg-primary-50">
            <Eye className="h-4 w-4" /> View full customer profile
          </Link>
        </section>

        <section className="border-b border-line py-5">
          <h3 className="text-sm font-extrabold text-ink">Service Details</h3>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3"><dt className="font-semibold text-muted">Service type</dt><dd className="text-ink">{schedule.service_type}</dd></div>
            <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3"><dt className="font-semibold text-muted">Recurrence</dt><dd className="text-ink">{recurrenceLabels[schedule.recurrence_type]}</dd></div>
            <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3"><dt className="font-semibold text-muted">Last service</dt><dd className="text-ink">{schedule.last_service_date ? formatDate(schedule.last_service_date) : "No completed service yet"}</dd></div>
            <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3"><dt className="font-semibold text-muted">Next service</dt><dd className="text-ink">{formatDate(schedule.next_service_date)}</dd></div>
            <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3"><dt className="font-semibold text-muted">Assigned technician</dt><dd className="text-ink">{schedule.assigned_technician || "Not assigned"}</dd></div>
            <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3"><dt className="font-semibold text-muted">Status</dt><dd><StatusBadge value={scheduleStatusLabel(schedule)} /></dd></div>
          </dl>
        </section>

        <section className="border-b border-line py-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-ink">Notes</h3>
            <SlidersHorizontal className="h-4 w-4 text-muted" />
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">{schedule.notes?.trim() || "No notes added."}</p>
        </section>

        <section className="pt-5">
          <h3 className="text-sm font-extrabold text-ink">Actions</h3>
          <div className="mt-4 grid gap-2">
            <Link href={`/admin/quotation-builder?customer=${schedule.customer_id}&service=${encodeURIComponent(schedule.service_type)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-bold text-primary-700 transition hover:bg-primary-50">
              <ClipboardList className="h-4 w-4" /> Create Quotation
            </Link>
            <Button variant="success" disabled={busyAction !== null || schedule.status === "completed" || schedule.status === "cancelled"} onClick={onMarkCompleted}><CheckCircle2 className="h-4 w-4" /> Mark Completed</Button>
            <Button variant="outline" disabled={busyAction !== null || schedule.status === "active"} onClick={onMarkScheduled}><CalendarClock className="h-4 w-4" /> Mark as Scheduled</Button>
            <Button variant="outline" disabled={busyAction !== null || schedule.status === "cancelled"} onClick={onReschedule}><RotateCcw className="h-4 w-4" /> Reschedule</Button>
            <Button variant="outline" disabled={busyAction !== null || schedule.status === "paused" || schedule.status === "cancelled"} onClick={onPause}><Pause className="h-4 w-4" /> Pause Schedule</Button>
            <Button variant="outline" className="border-red-200 text-danger hover:bg-red-50" disabled={busyAction !== null || schedule.status === "cancelled"} onClick={onCancel}><XCircle className="h-4 w-4" /> Cancel Schedule</Button>
          </div>
        </section>
      </div>
    </aside>
  );
}
