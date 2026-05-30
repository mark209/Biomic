"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, CheckCircle2, Pause, Plus, RotateCcw, XCircle } from "lucide-react";
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
import { createClient } from "@/lib/supabase/client";
import { serviceScheduleSchema } from "@/lib/validation";
import { formatDate } from "@/lib/utils";
import { formatDateInput, getScheduleWindow, nextServiceDateFrom, recurrenceLabels, scheduleWindowLabel } from "@/lib/service-workflow";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Inquiry = Database["public"]["Tables"]["inquiries"]["Row"];
type Quotation = Database["public"]["Tables"]["quotations"]["Row"];
type Schedule = Database["public"]["Tables"]["service_schedules"]["Row"];
type InputValues = z.input<typeof serviceScheduleSchema>;
type Values = z.output<typeof serviceScheduleSchema>;

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

    if (customerResult.error) setError(customerResult.error.message);
    if (scheduleResult.error) setError(scheduleResult.error.message);
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

  const selectedCustomerId = watch("customer_id");
  const customerInquiries = useMemo(() => inquiries.filter((inquiry) => inquiry.customer_id === selectedCustomerId), [inquiries, selectedCustomerId]);
  const customerQuotations = useMemo(() => quotations.filter((quote) => quote.customer_id === selectedCustomerId), [quotations, selectedCustomerId]);

  const sections = useMemo(() => {
    const active = schedules.filter((schedule) => schedule.status === "active");
    return {
      today: active.filter((schedule) => getScheduleWindow(schedule) === "today"),
      week: active.filter((schedule) => getScheduleWindow(schedule) === "upcoming"),
      monthly: active.filter((schedule) => schedule.recurrence_type === "monthly"),
      overdue: active.filter((schedule) => getScheduleWindow(schedule) === "overdue")
    };
  }, [schedules]);

  function customerFor(schedule: Schedule) {
    return customers.find((customer) => customer.id === schedule.customer_id);
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
      setError(insertError.message);
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
      setError(updateError.message);
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
    setRescheduling(schedule);
    setNextDate(schedule.next_service_date);
  }

  async function saveReschedule() {
    if (!rescheduling) return;
    await updateSchedule(rescheduling, { next_service_date: nextDate, status: "active" }, "Service rescheduled.", `reschedule-${rescheduling.id}`);
    setRescheduling(null);
  }

  async function cancelSchedule(schedule: Schedule) {
    const confirmed = window.confirm("Cancel this service schedule? It will be removed from active reminders.");
    if (!confirmed) return;
    await updateSchedule(schedule, { status: "cancelled" }, "Service schedule cancelled.", `cancel-${schedule.id}`);
  }

  function ScheduleCard({ schedule }: { schedule: Schedule }) {
    const customer = customerFor(schedule);
    const window = getScheduleWindow(schedule);

    return (
      <div className={`rounded-lg border bg-white p-4 shadow-panel ${focusedScheduleId === schedule.id ? "border-primary-300 ring-2 ring-primary-100" : "border-line"}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-ink">{customer?.name ?? "Unknown customer"}</h3>
              <StatusBadge value={scheduleWindowLabel(window)} />
              <StatusBadge value={schedule.status} />
            </div>
            <p className="mt-1 text-sm text-muted">{customer?.contact_number ?? "No contact number"}</p>
            <p className="mt-1 text-sm leading-5 text-muted">{customer?.address ?? "No address"}</p>
          </div>
          <div className="text-sm font-semibold text-primary-800">{formatDate(schedule.next_service_date)}</div>
        </div>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="font-bold text-ink">Service type</dt><dd className="text-muted">{schedule.service_type}</dd></div>
          <div><dt className="font-bold text-ink">Recurrence</dt><dd className="text-muted">{recurrenceLabels[schedule.recurrence_type]}</dd></div>
          <div><dt className="font-bold text-ink">Assigned technician</dt><dd className="text-muted">{schedule.assigned_technician || "Not assigned"}</dd></div>
          <div><dt className="font-bold text-ink">Last service</dt><dd className="text-muted">{schedule.last_service_date ? formatDate(schedule.last_service_date) : "No completed service yet"}</dd></div>
        </dl>
        <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
          <Link href={`/admin/customers/${schedule.customer_id}`} className="w-full sm:w-auto"><Button size="sm" variant="outline" className="w-full sm:w-auto">View Customer</Button></Link>
          <Link href={`/admin/quotation-builder?customer=${schedule.customer_id}&service=${encodeURIComponent(schedule.service_type)}`} className="w-full sm:w-auto"><Button size="sm" variant="outline" className="w-full sm:w-auto">Create Quotation</Button></Link>
          <Button size="sm" variant="outline" className="w-full sm:w-auto" disabled={busyAction !== null || schedule.status === "active"} onClick={() => updateSchedule(schedule, { status: "active" }, "Service marked as scheduled.", `schedule-${schedule.id}`)}><CalendarClock className="h-4 w-4" /> {busyAction === `schedule-${schedule.id}` ? "Saving..." : "Mark as Scheduled"}</Button>
          <Button size="sm" variant="success" className="w-full sm:w-auto" disabled={busyAction !== null || schedule.status === "completed" || schedule.status === "cancelled"} onClick={() => markCompleted(schedule)}><CheckCircle2 className="h-4 w-4" /> {busyAction === `complete-${schedule.id}` ? "Saving..." : "Mark Completed"}</Button>
          <Button size="sm" variant="outline" className="w-full sm:w-auto" disabled={busyAction !== null || schedule.status === "cancelled"} onClick={() => startReschedule(schedule)}><RotateCcw className="h-4 w-4" /> Reschedule</Button>
          <Button size="sm" variant="muted" className="w-full sm:w-auto" disabled={busyAction !== null || schedule.status === "paused" || schedule.status === "cancelled"} onClick={() => updateSchedule(schedule, { status: "paused" }, "Service schedule paused.", `pause-${schedule.id}`)}><Pause className="h-4 w-4" /> {busyAction === `pause-${schedule.id}` ? "Saving..." : "Pause Schedule"}</Button>
          <Button size="sm" variant="danger" className="w-full sm:w-auto" disabled={busyAction !== null || schedule.status === "cancelled"} onClick={() => cancelSchedule(schedule)}><XCircle className="h-4 w-4" /> {busyAction === `cancel-${schedule.id}` ? "Saving..." : "Cancel Schedule"}</Button>
        </div>
      </div>
    );
  }

  function ScheduleSection({ title, description, rows }: { title: string; description: string; rows: Schedule[] }) {
    return (
      <section className="admin-panel p-5">
        <div className="flex flex-col gap-1 border-b border-line pb-4">
          <h2 className="font-bold text-ink">{title}</h2>
          <p className="text-sm text-muted">{description}</p>
        </div>
        <div className="mt-4 grid gap-3">
          {rows.map((schedule) => <ScheduleCard key={`${title}-${schedule.id}`} schedule={schedule} />)}
          {!rows.length ? <p className="rounded-lg border border-dashed border-line p-5 text-center text-sm text-muted">No services in this group.</p> : null}
        </div>
      </section>
    );
  }

  return (
    <section>
      <AdminPageHeader
        title="Service Schedule"
        description="Track today, upcoming, monthly, and overdue service work."
        action={<Button onClick={startCreate}><Plus className="h-4 w-4" /> New service schedule</Button>}
      />
      {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-danger">{error}</div> : null}
      {success ? <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-success">{success}</div> : null}
      <div className="grid gap-5 xl:grid-cols-2">
        <ScheduleSection title="Overdue Services" description="Active service schedules past their next service date." rows={sections.overdue} />
        <ScheduleSection title="Services Today" description="Work that should be handled today." rows={sections.today} />
        <ScheduleSection title="Upcoming This Week" description="Active services due within the next 7 days." rows={sections.week} />
        <ScheduleSection title="Monthly Service Customers" description="Customers with active monthly service records." rows={sections.monthly} />
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
