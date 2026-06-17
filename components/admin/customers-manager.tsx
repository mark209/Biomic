"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Eye, Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { AdminPageHeader } from "./admin-page-header";
import { Button } from "@/components/ui/button";
import { CustomerBadges } from "@/components/ui/customer-badges";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input, Textarea } from "@/components/ui/field";
import { MobileCard } from "@/components/ui/mobile-card";
import { Modal } from "@/components/ui/modal";
import type { Database } from "@/lib/database.types";
import { getSafeErrorMessage } from "@/lib/security";
import { createClient } from "@/lib/supabase/client";
import { customerSchema } from "@/lib/validation";
import { formatDate } from "@/lib/utils";
import { badgesForCustomer, findDuplicateCustomers } from "@/lib/service-workflow";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Inquiry = Database["public"]["Tables"]["inquiries"]["Row"];
type Quotation = Database["public"]["Tables"]["quotations"]["Row"];
type Schedule = Database["public"]["Tables"]["service_schedules"]["Row"];
type Values = z.infer<typeof customerSchema>;

export function CustomersManager() {
  const params = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<Values>({ resolver: zodResolver(customerSchema) });

  const watchedContact = watch("contact_number");
  const watchedEmail = watch("email");

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const [customerResult, inquiryResult, quoteResult, scheduleResult] = await Promise.all([
      supabase.from("customers").select("*").order("created_at", { ascending: false }),
      supabase.from("inquiries").select("*").order("created_at", { ascending: false }),
      supabase.from("quotations").select("*").order("created_at", { ascending: false }),
      supabase.from("service_schedules").select("*").order("next_service_date", { ascending: true })
    ]);
    if (customerResult.error) setError(getSafeErrorMessage("load customers"));
    setCustomers(customerResult.data ?? []);
    setInquiries((inquiryResult.data ?? []) as Inquiry[]);
    setQuotations((quoteResult.data ?? []) as Quotation[]);
    setSchedules((scheduleResult.data ?? []) as Schedule[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const phone = params.get("phone");
    if (phone) setQuery(phone);
  }, [params]);

  const filtered = useMemo(() => {
    return customers.filter((customer) =>
      `${customer.name} ${customer.contact_number} ${customer.email ?? ""} ${customer.address}`.toLowerCase().includes(query.toLowerCase())
    );
  }, [customers, query]);

  const duplicateCandidates = useMemo(() => {
    return findDuplicateCustomers(customers, { contact_number: watchedContact ?? "", email: watchedEmail ?? "" }, editing?.id);
  }, [customers, watchedContact, watchedEmail, editing?.id]);

  function startCreate() {
    setEditing(null);
    reset({ name: "", contact_number: "", email: "", address: "", notes: "" });
    setOpen(true);
  }

  function startEdit(customer: Customer) {
    setEditing(customer);
    reset({
      name: customer.name,
      contact_number: customer.contact_number,
      email: customer.email ?? "",
      address: customer.address,
      notes: customer.notes ?? ""
    });
    setOpen(true);
  }

  async function onSubmit(values: Values) {
    setError(null);
    const duplicates = findDuplicateCustomers(customers, values, editing?.id);
    if (duplicates.length) {
      setError(`Possible duplicate customer: ${duplicates.map((customer) => customer.name).join(", ")}. Open the existing profile instead of creating another record.`);
      return;
    }
    const supabase = createClient();
    const payload = {
      name: values.name,
      contact_number: values.contact_number,
      email: values.email || null,
      address: values.address,
      notes: values.notes || null
    };

    const result = editing
      ? await (supabase as any).from("customers").update(payload).eq("id", editing.id)
      : await (supabase as any).from("customers").insert(payload);

    if (result.error) {
      setError(getSafeErrorMessage("save the customer"));
      return;
    }
    setOpen(false);
    await load();
  }

  const columns: Column<Customer>[] = [
    { key: "name", header: "Name", cell: (row) => <span className="grid gap-2"><span className="font-bold text-ink">{row.name}</span><CustomerBadges badges={badgesForCustomer(row, inquiries, quotations, schedules)} /></span> },
    { key: "contact", header: "Contact", cell: (row) => <span>{row.contact_number}<br /><span className="text-muted">{row.email || "No email"}</span></span> },
    { key: "address", header: "Address", cell: (row) => <span className="text-muted">{row.address}</span> },
    { key: "created", header: "Created", cell: (row) => formatDate(row.created_at) },
    {
      key: "actions",
      header: "Actions",
      className: "px-4 py-3 text-right",
      cell: (row) => (
        <div className="flex justify-end gap-2">
          <Link href={`/admin/customers/${row.id}`}><Button size="sm" variant="outline"><Eye className="h-4 w-4" /> View</Button></Link>
          <Button size="sm" variant="outline" onClick={() => startEdit(row)}><Edit className="h-4 w-4" /> Edit</Button>
        </div>
      )
    }
  ];

  return (
    <section>
      <AdminPageHeader
        title="Customers"
        description="Add, search, edit, and review customer service history."
        action={<Button onClick={startCreate}><Plus className="h-4 w-4" /> New customer</Button>}
      />
      {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-danger">{error}</div> : null}
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search customers"
        className="focus-ring mb-4 min-h-11 w-full rounded-md border-line bg-white text-sm md:max-w-sm"
      />
      {loading ? <p className="text-sm text-muted">Loading...</p> : <DataTable rows={filtered} columns={columns} emptyTitle="No customers" />}
      <div className="grid gap-3 lg:hidden">
        {filtered.map((customer) => (
          <div key={customer.id} className="grid gap-2">
            <MobileCard
              title={customer.name}
              subtitle={`${customer.contact_number} - ${customer.address}`}
              meta={formatDate(customer.created_at)}
              action={<div className="flex flex-wrap gap-2"><Link href={`/admin/customers/${customer.id}`}><Button size="sm" variant="outline">View</Button></Link><Button size="sm" variant="outline" onClick={() => startEdit(customer)}>Edit</Button></div>}
            />
            <CustomerBadges badges={badgesForCustomer(customer, inquiries, quotations, schedules)} />
          </div>
        ))}
      </div>
      <Modal title={editing ? "Edit customer" : "Add customer"} open={open} onClose={() => setOpen(false)}>
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <Input label="Name" {...register("name")} error={errors.name?.message} />
          <Input label="Contact number" {...register("contact_number")} error={errors.contact_number?.message} />
          <Input label="Email optional" type="email" {...register("email")} error={errors.email?.message} />
          {duplicateCandidates.length ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
              Possible duplicate: {duplicateCandidates.map((customer) => (
                <Link key={customer.id} href={`/admin/customers/${customer.id}`} className="ml-1 underline">
                  {customer.name}
                </Link>
              ))}
            </div>
          ) : null}
          <Input label="Address" {...register("address")} error={errors.address?.message} />
          <Textarea label="Notes" {...register("notes")} error={errors.notes?.message} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
