"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, FileText, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { AdminPageHeader } from "./admin-page-header";
import { Button } from "@/components/ui/button";
import { CustomerBadges } from "@/components/ui/customer-badges";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input, Select, Textarea } from "@/components/ui/field";
import { MobileCard } from "@/components/ui/mobile-card";
import { Modal } from "@/components/ui/modal";
import { StatusSelect } from "@/components/ui/status-select";
import { airconTypes, inquiryStatuses, serviceTypes } from "@/lib/constants";
import type { Database } from "@/lib/database.types";
import { makeDateScopedReference } from "@/lib/reference";
import { getSafeErrorMessage } from "@/lib/security";
import { createClient } from "@/lib/supabase/client";
import { inquirySchema } from "@/lib/validation";
import { formatDate } from "@/lib/utils";
import { badgesForInquiry, sortInquiriesForOps } from "@/lib/service-workflow";

type Inquiry = Database["public"]["Tables"]["inquiries"]["Row"];
type Quotation = Database["public"]["Tables"]["quotations"]["Row"];
type Schedule = Database["public"]["Tables"]["service_schedules"]["Row"];
type Values = z.infer<typeof inquirySchema>;

export function InquiriesManager() {
  const router = useRouter();
  const params = useSearchParams();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<Values>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      service_type: "Aircon Cleaning",
      aircon_type: "Wall-mounted Split",
      status: "New"
    }
  });

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const [inquiryResult, quoteResult, scheduleResult] = await Promise.all([
      supabase.from("inquiries").select("*").order("created_at", { ascending: false }),
      supabase.from("quotations").select("*").order("created_at", { ascending: false }),
      supabase.from("service_schedules").select("*").order("next_service_date", { ascending: true })
    ]);
    if (inquiryResult.error) setError(getSafeErrorMessage("load inquiries"));
    setInquiries(inquiryResult.data ?? []);
    setQuotations((quoteResult.data ?? []) as Quotation[]);
    setSchedules((scheduleResult.data ?? []) as Schedule[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const focus = params.get("focus") || params.get("ref") || params.get("phone");
    if (focus) setQuery(focus);
  }, [params]);

  const filtered = useMemo(() => {
    return sortInquiriesForOps(inquiries).filter((inquiry) => {
      const matchesStatus = status === "All" || inquiry.status === status;
      const matchesQuery = `${inquiry.id} ${inquiry.reference_number} ${inquiry.customer_name} ${inquiry.contact_number} ${inquiry.email ?? ""} ${inquiry.service_type} ${inquiry.problem_description}`
        .toLowerCase()
        .includes(query.toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [inquiries, query, status]);

  async function updateStatus(inquiry: Inquiry, nextStatus: string) {
    const supabase = createClient();
    const { error: updateError } = await (supabase as any).from("inquiries").update({ status: nextStatus }).eq("id", inquiry.id);
    if (updateError) setError(getSafeErrorMessage("update the inquiry"));
    await load();
  }

  async function onSubmit(values: Values) {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const { error: insertError } = await (supabase as any).from("inquiries").insert({
      reference_number: makeDateScopedReference("DAI"),
      customer_name: values.customer_name,
      contact_number: values.contact_number,
      email: values.email || null,
      address: values.address,
      service_type: values.service_type,
      aircon_type: values.aircon_type,
      brand_model: values.brand_model || null,
      problem_description: values.problem_description,
      preferred_schedule: values.preferred_schedule || null,
      status: values.status ?? "New",
      created_by: user?.id ?? null
    });

    if (insertError) {
      setError(getSafeErrorMessage("save the inquiry"));
      return;
    }
    setOpen(false);
    reset();
    await load();
  }

  const columns: Column<Inquiry>[] = [
    { key: "ref", header: "Reference", cell: (row) => <span className="grid gap-1"><span className="font-bold text-primary-800">{row.reference_number}</span>{row.status === "New" ? <span className="w-fit rounded bg-primary-100 px-2 py-1 text-xs font-extrabold text-primary-800">NEW</span> : null}</span> },
    { key: "customer", header: "Customer", cell: (row) => <span className="grid gap-2"><span>{row.customer_name}<br /><span className="text-muted">{row.contact_number}</span></span><CustomerBadges badges={badgesForInquiry(row, inquiries, quotations, schedules)} /></span> },
    { key: "service", header: "Service", cell: (row) => <span className="text-muted">{row.service_type}</span> },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <StatusSelect
          value={row.status}
          options={inquiryStatuses}
          onValueChange={(nextStatus) => updateStatus(row, nextStatus)}
          label={`Update status for ${row.reference_number}`}
        />
      )
    },
    { key: "date", header: "Logged", cell: (row) => formatDate(row.created_at) },
    {
      key: "action",
      header: "Action",
      className: "px-4 py-3 text-right",
      cell: (row) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => router.push(`/admin/quotations?action=create&inquiry=${row.id}`)}>
            <FileText className="h-4 w-4" />
            Create Quotation
          </Button>
          <Link href={`/admin/service-desk?tab=schedule&inquiry=${row.id}`}><Button size="sm" variant="outline"><CalendarDays className="h-4 w-4" /> Schedule</Button></Link>
        </div>
      )
    }
  ];

  return (
    <section>
      <AdminPageHeader
        title="Inquiries"
        description="Review website, phone, and walk-in requests. Convert approved requests into quotations."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Manual inquiry</Button>}
      />
      {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-danger">{error}</div> : null}
      <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,24rem)_14rem]">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, phone, reference number" className="focus-ring min-h-11 rounded-md border-line bg-white text-sm" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 rounded-md border-line bg-white text-sm">
          <option>All</option>
          {inquiryStatuses.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      {loading ? <p className="text-sm text-muted">Loading...</p> : <DataTable rows={filtered} columns={columns} emptyTitle="No inquiries" breakpoint="xl" />}
      <div className="grid gap-3 xl:hidden">
        {filtered.map((inquiry) => (
          <div key={inquiry.id} className="grid gap-2">
            <MobileCard
              title={inquiry.reference_number}
              subtitle={`${inquiry.customer_name} - ${inquiry.service_type}`}
              status={inquiry.status}
              meta={formatDate(inquiry.created_at)}
              action={<div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => router.push(`/admin/quotations?action=create&inquiry=${inquiry.id}`)}>Create Quotation</Button><Link href={`/admin/service-desk?tab=schedule&inquiry=${inquiry.id}`}><Button size="sm" variant="outline">Schedule</Button></Link></div>}
            />
            <CustomerBadges badges={badgesForInquiry(inquiry, inquiries, quotations, schedules)} />
          </div>
        ))}
      </div>
      <Modal title="Create manual inquiry" open={open} onClose={() => setOpen(false)}>
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Customer name" {...register("customer_name")} error={errors.customer_name?.message} />
            <Input label="Contact number" {...register("contact_number")} error={errors.contact_number?.message} />
          </div>
          <Input label="Email optional" type="email" {...register("email")} error={errors.email?.message} />
          <Input label="Address" {...register("address")} error={errors.address?.message} />
          <div className="grid gap-4 md:grid-cols-2">
            <Select label="Service type" {...register("service_type")}>{serviceTypes.map((item) => <option key={item}>{item}</option>)}</Select>
            <Select label="Aircon type" {...register("aircon_type")}>{airconTypes.map((item) => <option key={item}>{item}</option>)}</Select>
          </div>
          <Input label="Brand/model optional" {...register("brand_model")} />
          <Textarea label="Problem description" {...register("problem_description")} error={errors.problem_description?.message} />
          <Select label="Status" {...register("status")}>{inquiryStatuses.map((item) => <option key={item}>{item}</option>)}</Select>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save inquiry"}</Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
