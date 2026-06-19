"use client";

import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileUp,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "./admin-page-header";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { hqBillingStatuses, serviceTypes } from "@/lib/constants";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { cn, formatDate, money } from "@/lib/utils";

type BillingRecord = Database["public"]["Tables"]["hq_billing_records"]["Row"];
type BillingStatus = BillingRecord["billing_status"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type BillingForm = {
  service_reference: string;
  client_branch: string;
  service_type: string;
  service_date: string;
  technician: string;
  service_location: string;
  po_number: string;
  po_date: string;
  po_amount: string;
  gr_number: string;
  gr_date: string;
  gr_remarks: string;
  billing_status: BillingStatus;
  amount: string;
  billing_submitted_date: string;
  expected_payment_date: string;
  actual_payment_date: string;
  remarks: string;
};

type BillingFieldErrors = Partial<Record<keyof BillingForm, string>>;

const PO_BUCKET = "hq-billing-po";
const MAX_PO_SIZE = 10 * 1024 * 1024;
const PO_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const PAGE_SIZE = 5;

const emptyForm: BillingForm = {
  service_reference: "",
  client_branch: "",
  service_type: "Aircon Cleaning",
  service_date: "",
  technician: "",
  service_location: "",
  po_number: "",
  po_date: "",
  po_amount: "",
  gr_number: "",
  gr_date: "",
  gr_remarks: "",
  billing_status: "For Billing",
  amount: "",
  billing_submitted_date: "",
  expected_payment_date: "",
  actual_payment_date: "",
  remarks: ""
};

const statusStyles: Record<BillingStatus, { icon: typeof Clock3; card: string; badge: string; iconBox: string }> = {
  "For Billing": {
    icon: Clock3,
    card: "border-amber-200 shadow-[0_8px_24px_rgba(217,119,6,0.12)]",
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
    iconBox: "bg-amber-100 text-amber-700"
  },
  Billed: {
    icon: ReceiptText,
    card: "border-blue-200 shadow-[0_8px_24px_rgba(0,125,194,0.10)]",
    badge: "bg-blue-50 text-blue-800 ring-blue-200",
    iconBox: "bg-blue-100 text-blue-700"
  },
  Backjob: {
    icon: AlertCircle,
    card: "border-red-200 shadow-[0_8px_24px_rgba(186,26,26,0.10)]",
    badge: "bg-red-50 text-red-800 ring-red-200",
    iconBox: "bg-red-100 text-red-700"
  },
  "Pending Payment": {
    icon: RefreshCw,
    card: "border-orange-200 shadow-[0_8px_24px_rgba(234,88,12,0.12)]",
    badge: "bg-orange-50 text-orange-800 ring-orange-200",
    iconBox: "bg-orange-100 text-orange-700"
  },
  Paid: {
    icon: CheckCircle2,
    card: "border-emerald-200 shadow-[0_8px_24px_rgba(17,122,72,0.10)]",
    badge: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    iconBox: "bg-emerald-100 text-emerald-700"
  }
};

function dateInput(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function formFromRecord(record: BillingRecord): BillingForm {
  return {
    service_reference: record.service_reference,
    client_branch: record.client_branch,
    service_type: record.service_type,
    service_date: dateInput(record.service_date),
    technician: record.technician ?? "",
    service_location: record.service_location ?? "",
    po_number: record.po_number ?? "",
    po_date: dateInput(record.po_date),
    po_amount: record.po_amount === null ? "" : String(record.po_amount),
    gr_number: record.gr_number ?? "",
    gr_date: dateInput(record.gr_date),
    gr_remarks: record.gr_remarks ?? "",
    billing_status: record.billing_status,
    amount: String(record.amount),
    billing_submitted_date: dateInput(record.billing_submitted_date),
    expected_payment_date: dateInput(record.expected_payment_date),
    actual_payment_date: dateInput(record.actual_payment_date),
    remarks: record.remarks ?? ""
  };
}

function statusBadge(status: BillingStatus, extra?: string) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ring-1", statusStyles[status].badge, extra)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function HQBillingManager() {
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [clientFilter, setClientFilter] = useState("All Clients");
  const [monthFilter, setMonthFilter] = useState("This Month");
  const [dataFilter, setDataFilter] = useState("All Records");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BillingRecord | null>(null);
  const [viewing, setViewing] = useState<BillingRecord | null>(null);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<BillingForm>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<BillingFieldErrors>({});
  const [poFile, setPoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const [recordsResult, profileResult] = await Promise.all([
      supabase.from("hq_billing_records").select("*").is("deleted_at", null).order("service_date", { ascending: false }),
      user ? supabase.from("profiles").select("*").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null, error: null })
    ]);

    if (recordsResult.error) {
      setError(recordsResult.error.message);
      setRecords([]);
    } else {
      setRecords((recordsResult.data ?? []) as BillingRecord[]);
    }
    if (profileResult.error) setError(profileResult.error.message);
    setProfile((profileResult.data ?? null) as Profile | null);
    setLastUpdated(new Date());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const isAdmin = profile?.role === "admin";
  const clients = useMemo(() => Array.from(new Set(records.map((record) => record.client_branch))).sort(), [records]);

  const filtered = useMemo(() => {
    const now = new Date();
    return records.filter((record) => {
      const haystack = normalize(`${record.service_reference} ${record.client_branch} ${record.po_number ?? ""} ${record.gr_number ?? ""} ${record.technician ?? ""} ${record.service_type}`);
      const recordDate = new Date(`${record.service_date}T00:00:00`);
      const matchesMonth =
        monthFilter === "All Dates" ||
        (monthFilter === "This Month" && recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear()) ||
        (monthFilter === "Last 30 Days" && now.getTime() - recordDate.getTime() <= 30 * 86400000) ||
        (monthFilter === "This Year" && recordDate.getFullYear() === now.getFullYear());
      const matchesData =
        dataFilter === "All Records" ||
        (dataFilter === "Has PO" && Boolean(record.po_attachment_url)) ||
        (dataFilter === "Missing PO" && !record.po_attachment_url) ||
        (dataFilter === "Missing GR" && !record.gr_number);

      return (
        (!query.trim() || haystack.includes(normalize(query))) &&
        (statusFilter === "All Statuses" || record.billing_status === statusFilter) &&
        (clientFilter === "All Clients" || record.client_branch === clientFilter) &&
        matchesMonth &&
        matchesData
      );
    });
  }, [clientFilter, dataFilter, monthFilter, query, records, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [clientFilter, dataFilter, monthFilter, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = filtered.length ? (currentPage - 1) * PAGE_SIZE : 0;
  const pagedRecords = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const summaries = useMemo(() => {
    return hqBillingStatuses.map((status) => {
      const rows = records.filter((record) => record.billing_status === status);
      return {
        status,
        count: rows.length,
        total: rows.reduce((sum, record) => sum + Number(record.amount ?? 0), 0)
      };
    });
  }, [records]);

  function updateForm(patch: Partial<BillingForm>) {
    const fields = Object.keys(patch) as Array<keyof BillingForm>;
    if (fields.length) {
      setFieldErrors((current) => {
        const next = { ...current };
        fields.forEach((field) => delete next[field]);
        return next;
      });
    }
    setForm((current) => ({ ...current, ...patch }));
  }

  function startCreate() {
    setEditing(null);
    setPoFile(null);
    setFieldErrors({});
    setForm({ ...emptyForm, service_reference: `SVC-${new Date().getFullYear()}-${String(records.length + 1).padStart(4, "0")}` });
    setFormOpen(true);
  }

  function startEdit(record: BillingRecord) {
    setEditing(record);
    setPoFile(null);
    setFieldErrors({});
    setForm(formFromRecord(record));
    setFormOpen(true);
  }

  function duplicateWarnings(target: BillingForm, currentId?: string) {
    const amount = Number(target.amount || 0);
    return records.filter((record) => {
      if (record.id === currentId) return false;
      const samePo = target.po_number && record.po_number && normalize(record.po_number) === normalize(target.po_number);
      const sameGr = target.gr_number && record.gr_number && normalize(record.gr_number) === normalize(target.gr_number);
      const sameService = target.service_reference && normalize(record.service_reference) === normalize(target.service_reference);
      const sameManual = normalize(record.client_branch) === normalize(target.client_branch) && dateInput(record.service_date) === target.service_date && Number(record.amount) === amount;
      return samePo || sameGr || sameService || sameManual;
    });
  }

  function validateFile(file: File) {
    if (!PO_TYPES.includes(file.type)) return "PO attachment must be a PDF, JPG, JPEG, or PNG file.";
    if (file.size > MAX_PO_SIZE) return "PO attachment must be 10MB or smaller.";
    return null;
  }

  async function uploadPo(recordId: string, file: File) {
    const validation = validateFile(file);
    if (validation) throw new Error(validation);
    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const path = `billing/${recordId}/${crypto.randomUUID()}.${ext}`;
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage.from(PO_BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false
    });
    if (uploadError) throw uploadError;
    return {
      po_attachment_url: path,
      po_attachment_name: file.name,
      po_attachment_type: file.type,
      po_attachment_size: file.size
    };
  }

  async function saveRecord() {
    setError(null);
    setFieldErrors({});
    setMessage(null);

    const nextFieldErrors: BillingFieldErrors = {};
    if (!form.client_branch.trim()) nextFieldErrors.client_branch = "Client / Branch is required.";
    if (!form.service_type.trim()) nextFieldErrors.service_type = "Service Type is required.";
    if (!form.service_date) nextFieldErrors.service_date = "Service Date is required.";
    if (!form.amount) nextFieldErrors.amount = "Amount is required.";
    if (!form.billing_status) nextFieldErrors.billing_status = "Billing Status is required.";

    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      return;
    }
    if (["Billed", "Pending Payment", "Paid"].includes(form.billing_status) && (!form.po_number.trim() || (!poFile && !editing?.po_attachment_url))) {
      const proceed = window.confirm("PO Number and PO Attachment are recommended before marking this record as billed or paid. Continue anyway?");
      if (!proceed) return;
    }

    const duplicates = duplicateWarnings(form, editing?.id);
    if (duplicates.length) {
      const proceed = window.confirm("Possible duplicate billing record found. Please review before saving. Continue anyway?");
      if (!proceed) return;
    }

    setSaving(true);
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const expectedPaymentDate = form.expected_payment_date || (form.billing_submitted_date ? addDays(form.billing_submitted_date, 40) : "");
    const payload = {
      service_reference: form.service_reference.trim() || `SVC-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
      client_branch: form.client_branch.trim(),
      service_type: form.service_type.trim(),
      service_date: form.service_date,
      technician: form.technician.trim() || null,
      service_location: form.service_location.trim() || null,
      po_number: form.po_number.trim() || null,
      po_date: form.po_date || null,
      po_amount: form.po_amount ? Number(form.po_amount) : null,
      gr_number: form.gr_number.trim() || null,
      gr_date: form.gr_date || null,
      gr_remarks: form.gr_remarks.trim() || null,
      billing_status: form.billing_status,
      amount: Number(form.amount),
      billing_submitted_date: form.billing_submitted_date || null,
      expected_payment_date: expectedPaymentDate || null,
      actual_payment_date: form.actual_payment_date || null,
      remarks: form.remarks.trim() || null,
      updated_by: user?.id ?? null
    };

    try {
      let saved: BillingRecord | null = null;
      if (editing) {
        const { data, error: updateError } = await (supabase as any).from("hq_billing_records").update(payload).eq("id", editing.id).select().single();
        if (updateError) throw updateError;
        saved = data as BillingRecord;
      } else {
        const { data, error: insertError } = await (supabase as any)
          .from("hq_billing_records")
          .insert({ ...payload, created_by: user?.id ?? null })
          .select()
          .single();
        if (insertError) throw insertError;
        saved = data as BillingRecord;
      }

      if (poFile && saved) {
        if (editing?.po_attachment_url) await supabase.storage.from(PO_BUCKET).remove([editing.po_attachment_url]);
        const attachmentPatch = await uploadPo(saved.id, poFile);
        const { data, error: attachmentError } = await (supabase as any).from("hq_billing_records").update(attachmentPatch).eq("id", saved.id).select().single();
        if (attachmentError) throw attachmentError;
        saved = data as BillingRecord;
      }

      setMessage(editing ? "Billing record updated." : "Manual billing record added.");
      setFormOpen(false);
      setEditing(null);
      setPoFile(null);
      await load();
      if (saved) setViewing(saved);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save billing record.");
    } finally {
      setSaving(false);
    }
  }

  async function signedUrl(record: BillingRecord, download = false) {
    if (!record.po_attachment_url) return null;
    const supabase = createClient();
    const { data, error: signedError } = await supabase.storage.from(PO_BUCKET).createSignedUrl(record.po_attachment_url, 60 * 10, {
      download: download ? record.po_attachment_name ?? "po-attachment" : undefined
    });
    if (signedError) {
      setError(signedError.message);
      return null;
    }
    return data.signedUrl;
  }

  async function openPo(record: BillingRecord, mode: "view" | "download" | "print" = "view") {
    const url = await signedUrl(record, mode === "download");
    if (!url) return;
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (mode === "print" && opened) opened.addEventListener("load", () => opened.print());
  }

  async function replacePo(record: BillingRecord, file: File) {
    setError(null);
    try {
      const supabase = createClient();
      if (record.po_attachment_url) await supabase.storage.from(PO_BUCKET).remove([record.po_attachment_url]);
      const patch = await uploadPo(record.id, file);
      const { error: updateError } = await (supabase as any).from("hq_billing_records").update(patch).eq("id", record.id);
      if (updateError) throw updateError;
      setMessage("PO attachment updated.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to replace PO attachment.");
    }
  }

  async function updateStatus(record: BillingRecord, status: BillingStatus) {
    const supabase = createClient();
    const patch: Partial<BillingRecord> = { billing_status: status };
    if (status === "Paid" && !record.actual_payment_date) patch.actual_payment_date = new Date().toISOString().slice(0, 10);
    const { error: updateError } = await (supabase as any).from("hq_billing_records").update(patch).eq("id", record.id);
    if (updateError) setError(updateError.message);
    else {
      setMessage(`Record marked as ${status}.`);
      await load();
    }
  }

  async function deleteRecord(record: BillingRecord) {
    if (!isAdmin) return;
    if (!window.confirm("Delete this billing record?")) return;
    const supabase = createClient();
    const { error: deleteError } = await (supabase as any).from("hq_billing_records").update({ deleted_at: new Date().toISOString() }).eq("id", record.id);
    if (deleteError) setError(deleteError.message);
    else {
      setMessage("Billing record deleted.");
      if (viewing?.id === record.id) setViewing(null);
      await load();
    }
  }

  function exportCsv() {
    const headers = ["Service ID", "Client / Branch", "Service Type", "Service Date", "Technician", "PO Number", "GR Number", "Status", "Amount", "Submitted Date", "Expected Payment Date", "Actual Payment Date", "Remarks"];
    const rows = filtered.map((record) => [
      record.service_reference,
      record.client_branch,
      record.service_type,
      record.service_date,
      record.technician ?? "",
      record.po_number ?? "",
      record.gr_number ?? "",
      record.billing_status,
      String(record.amount),
      record.billing_submitted_date ?? "",
      record.expected_payment_date ?? "",
      record.actual_payment_date ?? "",
      record.remarks ?? ""
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hq-billing-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section>
      <div className="mb-4 flex flex-col gap-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span>Portal</span>
          <span>/</span>
          <span className="font-bold text-ink">PO / GR Records</span>
        </div>
        <div className="text-right">
          <span className="block">Last updated</span>
          <span className="font-mono font-bold text-ink">{lastUpdated ? formatDateTime(lastUpdated) : "Loading..."}</span>
        </div>
      </div>

      <AdminPageHeader
        title="PO / GR Records"
        description="Track purchase orders, goods receipts, billing status, attachments, and payment progress for Head Office services."
      />

      {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-danger">{error}</div> : null}
      {message ? <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-success">{message}</div> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {summaries.map((item) => {
          const Icon = statusStyles[item.status].icon;
          return (
            <button key={item.status} type="button" onClick={() => setStatusFilter(item.status)} className={cn("rounded-lg border bg-white p-4 text-left transition hover:-translate-y-0.5", statusStyles[item.status].card)}>
              <div className="flex items-start justify-between gap-3">
                <span className={cn("grid h-9 w-9 place-items-center rounded-md", statusStyles[item.status].iconBox)}><Icon className="h-5 w-5" /></span>
                <span className="text-2xl font-extrabold text-ink">{item.count}</span>
              </div>
              <h3 className="mt-3 text-sm font-extrabold text-ink">{item.status}</h3>
              <p className="mt-1 text-xs font-semibold text-muted">{money(item.total)}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-5 admin-panel p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[16rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by client, service ID, PO, GR number..." className="focus-ring min-h-11 w-full rounded-md border-line bg-white pl-10 text-sm" />
          </label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="focus-ring min-h-11 rounded-md border-line bg-white text-sm">
            <option>All Statuses</option>
            {hqBillingStatuses.map((status) => <option key={status}>{status}</option>)}
          </select>
          <select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)} className="focus-ring min-h-11 rounded-md border-line bg-white text-sm">
            <option>All Clients</option>
            {clients.map((client) => <option key={client}>{client}</option>)}
          </select>
          <select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} className="focus-ring min-h-11 rounded-md border-line bg-white text-sm">
            <option>This Month</option>
            <option>Last 30 Days</option>
            <option>This Year</option>
            <option>All Dates</option>
          </select>
          <select value={dataFilter} onChange={(event) => setDataFilter(event.target.value)} className="focus-ring min-h-11 rounded-md border-line bg-white text-sm">
            <option>All Records</option>
            <option>Has PO</option>
            <option>Missing PO</option>
            <option>Missing GR</option>
          </select>
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" /> Export</Button>
          <Button onClick={startCreate}><Plus className="h-4 w-4" /> Add PO / GR Record</Button>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-line bg-white shadow-panel">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] table-fixed border-collapse text-left text-sm">
            <colgroup>
              <col className="w-[9rem]" />
              <col className="w-[16rem]" />
              <col className="w-[8rem]" />
              <col className="w-[9rem]" />
              <col className="w-[9rem]" />
              <col className="w-[8rem]" />
              <col className="w-[8rem]" />
              <col className="w-[10rem]" />
              <col className="w-[9rem]" />
              <col className="w-[8rem]" />
              <col className="w-[9rem]" />
            </colgroup>
            <thead className="bg-slate-50 text-xs font-extrabold text-muted">
              <tr className="border-b border-line">
                {["Service ID", "Client / Branch", "Service Date", "Technician", "PO Number", "PO Attachment", "GR Number", "Status", "Amount (PHP)", "Submitted", "Actions"].map((header) => (
                  <th key={header} className="px-3 py-3">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-muted">Loading billing records...</td></tr>
              ) : pagedRecords.length ? pagedRecords.map((record) => (
                <tr key={record.id} className="h-[64px] hover:bg-primary-50/50">
                  <td className="px-3 py-2 align-middle">
                    <span className="block truncate font-bold text-primary-800" title={record.service_reference}>{record.service_reference}</span>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <span className="block truncate font-bold text-ink" title={record.client_branch.split("-")[0].trim()}>{record.client_branch.split("-")[0].trim()}</span>
                    <span className="flex min-w-0 items-center gap-1 text-xs text-muted"><Building2 className="h-3 w-3 shrink-0" /><span className="truncate" title={record.client_branch}>{record.client_branch}</span></span>
                  </td>
                  <td className="px-3 py-2 align-middle font-mono text-xs text-ink">{formatDate(record.service_date)}</td>
                  <td className="px-3 py-2 align-middle text-ink"><span className="block truncate" title={record.technician || "-"}>{record.technician || "-"}</span></td>
                  <td className="px-3 py-2 align-middle font-mono text-xs text-ink"><span className="block truncate" title={record.po_number || "-"}>{record.po_number || "-"}</span></td>
                  <td className="px-3 py-2 align-middle">
                    {record.po_attachment_url ? (
                      <button className="inline-flex items-center gap-1 whitespace-nowrap font-bold text-primary-700 hover:underline" onClick={() => openPo(record)}>
                        <FileUp className="h-4 w-4" /> View PO
                      </button>
                    ) : (
                      <label className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap font-bold text-muted hover:text-primary-700">
                        <Upload className="h-4 w-4" /> Upload PO
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={(event) => event.target.files?.[0] && replacePo(record, event.target.files[0])} />
                      </label>
                    )}
                  </td>
                  <td className="px-3 py-2 align-middle font-mono text-xs text-ink"><span className="block truncate" title={record.gr_number || "Missing"}>{record.gr_number || <span className="text-muted">Missing</span>}</span></td>
                  <td className="px-3 py-2 align-middle">{statusBadge(record.billing_status)}</td>
                  <td className="px-3 py-2 align-middle font-extrabold text-ink">{money(record.amount)}</td>
                  <td className="px-3 py-2 align-middle font-mono text-xs text-ink">{record.billing_submitted_date ? formatDate(record.billing_submitted_date) : "-"}</td>
                  <td className="px-3 py-2 align-middle">
                    <div className="flex items-center">
                      <Button size="sm" variant="outline" onClick={() => setViewing(record)}><Eye className="h-4 w-4" /> View</Button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center">
                    <p className="font-bold text-ink">No billing records yet.</p>
                    <p className="mt-1 text-sm text-muted">Add your first billing record to start tracking PO, GR, and billing status.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-line px-4 py-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>
            {filtered.length
              ? `Showing ${pageStart + 1}-${Math.min(pageStart + PAGE_SIZE, filtered.length)} of ${filtered.length} billing records`
              : "Showing 0 billing records"}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).slice(0, 7).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
                className={cn(
                  "focus-ring grid h-9 w-9 place-items-center rounded-md border text-sm font-bold",
                  pageNumber === currentPage ? "border-primary-600 bg-primary-600 text-white" : "border-line bg-white text-ink hover:bg-slate-50"
                )}
              >
                {pageNumber}
              </button>
            ))}
            {totalPages > 7 ? <span className="px-1 font-bold text-muted">...</span> : null}
            <Button size="sm" variant="outline" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={currentPage === totalPages}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <BillingFormModal
        open={formOpen}
        editing={editing}
        form={form}
        fieldErrors={fieldErrors}
        poFile={poFile}
        saving={saving}
        onClose={() => {
          setFormOpen(false);
          setFieldErrors({});
        }}
        onSave={saveRecord}
        onFile={setPoFile}
        onChange={updateForm}
      />

      {viewing ? (
        <BillingDetailDrawer
          record={viewing}
          isAdmin={isAdmin}
          onClose={() => setViewing(null)}
          onEdit={() => startEdit(viewing)}
          onOpenPo={openPo}
          onReplacePo={replacePo}
          onDelete={deleteRecord}
        />
      ) : null}
    </section>
  );
}

function BillingFormModal({
  open,
  editing,
  form,
  fieldErrors,
  poFile,
  saving,
  onClose,
  onSave,
  onFile,
  onChange
}: {
  open: boolean;
  editing: BillingRecord | null;
  form: BillingForm;
  fieldErrors: BillingFieldErrors;
  poFile: File | null;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onFile: (file: File | null) => void;
  onChange: (patch: Partial<BillingForm>) => void;
}) {
  return (
    <Modal title={editing ? "Edit Manual Billing Record" : "Add Manual Billing Record"} open={open} onClose={onClose}>
      <div className="grid gap-5">
        <FormSection title="Basic Service Details">
          <Field label="Service ID / Reference No." value={form.service_reference} onChange={(value) => onChange({ service_reference: value })} placeholder="SVC-2024-0341" />
          <Field label="Client / Branch" value={form.client_branch} onChange={(value) => onChange({ client_branch: value })} placeholder="SM Supermalls - SM North EDSA" error={fieldErrors.client_branch} required />
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            Service Type
            <input list="hq-service-types" value={form.service_type} onChange={(event) => onChange({ service_type: event.target.value })} className={cn("focus-ring min-h-11 rounded-md bg-white text-sm", fieldErrors.service_type ? "border-red-300 ring-1 ring-red-200" : "border-line")} aria-invalid={Boolean(fieldErrors.service_type)} required />
            <datalist id="hq-service-types">{serviceTypes.map((type) => <option key={type}>{type}</option>)}</datalist>
            {fieldErrors.service_type ? <span className="text-xs font-bold text-danger">{fieldErrors.service_type}</span> : null}
          </label>
          <Field label="Service Date" type="date" value={form.service_date} onChange={(value) => onChange({ service_date: value })} error={fieldErrors.service_date} required />
          <Field label="Technician" value={form.technician} onChange={(value) => onChange({ technician: value })} />
          <Area label="Service Location / Address" value={form.service_location} onChange={(value) => onChange({ service_location: value })} />
        </FormSection>

        <FormSection title="PO Details">
          <Field label="PO Number" value={form.po_number} onChange={(value) => onChange({ po_number: value })} placeholder="8000075981" />
          <Field label="PO Date" type="date" value={form.po_date} onChange={(value) => onChange({ po_date: value })} />
          <Field label="PO Amount" type="number" value={form.po_amount} onChange={(value) => onChange({ po_amount: value })} />
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            PO Attachment
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => onFile(event.target.files?.[0] ?? null)} className="focus-ring rounded-md border border-line bg-white p-2 text-sm" />
            <span className="text-xs font-medium text-muted">{poFile ? poFile.name : "PDF, JPG, JPEG, or PNG. Max 10MB."}</span>
          </label>
        </FormSection>

        <FormSection title="GR Details">
          <Field label="GR Number" value={form.gr_number} onChange={(value) => onChange({ gr_number: value })} />
          <Field label="GR Date" type="date" value={form.gr_date} onChange={(value) => onChange({ gr_date: value })} />
          <Area label="GR Remarks" value={form.gr_remarks} onChange={(value) => onChange({ gr_remarks: value })} />
        </FormSection>

        <FormSection title="Billing Details">
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            Billing Status
            <select value={form.billing_status} onChange={(event) => onChange({ billing_status: event.target.value as BillingStatus })} className={cn("focus-ring min-h-11 rounded-md bg-white text-sm", fieldErrors.billing_status ? "border-red-300 ring-1 ring-red-200" : "border-line")} aria-invalid={Boolean(fieldErrors.billing_status)}>
              {hqBillingStatuses.map((status) => <option key={status}>{status}</option>)}
            </select>
            {fieldErrors.billing_status ? <span className="text-xs font-bold text-danger">{fieldErrors.billing_status}</span> : null}
          </label>
          <Field label="Amount" type="number" value={form.amount} onChange={(value) => onChange({ amount: value })} error={fieldErrors.amount} required />
          <Field label="Billing Submitted Date" type="date" value={form.billing_submitted_date} onChange={(value) => onChange({ billing_submitted_date: value, expected_payment_date: form.expected_payment_date || addDays(value, 40) })} />
          <Field label="Expected Payment Date" type="date" value={form.expected_payment_date} onChange={(value) => onChange({ expected_payment_date: value })} />
          <Field label="Actual Payment Date" type="date" value={form.actual_payment_date} onChange={(value) => onChange({ actual_payment_date: value })} />
          <Area label="Remarks" value={form.remarks} onChange={(value) => onChange({ remarks: value })} />
        </FormSection>
      </div>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save billing record"}</Button>
      </div>
    </Modal>
  );
}

function BillingDetailDrawer({
  record,
  isAdmin,
  onClose,
  onEdit,
  onOpenPo,
  onReplacePo,
  onDelete
}: {
  record: BillingRecord;
  isAdmin: boolean;
  onClose: () => void;
  onEdit: () => void;
  onOpenPo: (record: BillingRecord, mode?: "view" | "download" | "print") => void;
  onReplacePo: (record: BillingRecord, file: File) => void;
  onDelete: (record: BillingRecord) => void;
}) {
  const expected = record.expected_payment_date ? new Date(`${record.expected_payment_date}T00:00:00`) : null;
  const daysUntil = expected ? Math.ceil((expected.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000) : null;
  const overdue = daysUntil !== null && daysUntil < 0 && record.billing_status !== "Paid";

  return (
    <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-white shadow-soft lg:top-16">
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-5">
        <div>
          <h2 className="text-lg font-extrabold text-ink">{record.service_reference}</h2>
          <div className="mt-2">{statusBadge(record.billing_status)}</div>
        </div>
        <button onClick={onClose} className="focus-ring grid h-10 w-10 place-items-center rounded-md text-muted hover:bg-slate-100" aria-label="Close billing details"><X className="h-5 w-5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <Button className="mb-5 w-full" variant="outline" onClick={onEdit}><Pencil className="h-4 w-4" /> Edit Billing Info</Button>
        <DetailSection title="Service Details" rows={[
          ["Client / Branch", record.client_branch],
          ["Service Type", record.service_type],
          ["Service Date", formatDate(record.service_date)],
          ["Technician", record.technician || "Not assigned"],
          ["Service Location", record.service_location || "Not set"]
        ]} />
        <section className="border-b border-line py-5">
          <h3 className="text-sm font-extrabold text-ink">PO Details</h3>
          <dl className="mt-3 grid gap-3 text-sm">
            <DetailRow label="PO Number" value={record.po_number || "Missing"} />
            <DetailRow label="PO Date" value={record.po_date ? formatDate(record.po_date) : "Not set"} />
            <DetailRow label="PO Amount" value={record.po_amount === null ? "Not set" : money(record.po_amount)} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            {record.po_attachment_url ? (
              <>
                <Button size="sm" variant="outline" onClick={() => onOpenPo(record)}><Eye className="h-4 w-4" /> View</Button>
                <Button size="sm" variant="outline" onClick={() => onOpenPo(record, "download")}><Download className="h-4 w-4" /> Download</Button>
                <Button size="sm" variant="outline" onClick={() => onOpenPo(record, "print")}><Printer className="h-4 w-4" /> Print</Button>
              </>
            ) : null}
            <label className="focus-ring inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-bold text-ink hover:bg-primary-50">
              <Upload className="h-4 w-4" /> {record.po_attachment_url ? "Replace PO" : "Upload PO"}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={(event) => event.target.files?.[0] && onReplacePo(record, event.target.files[0])} />
            </label>
          </div>
        </section>
        <DetailSection title="GR Details" rows={[
          ["GR Number", record.gr_number || "Missing"],
          ["GR Date", record.gr_date ? formatDate(record.gr_date) : "Not set"],
          ["GR Remarks", record.gr_remarks || "No remarks"]
        ]} />
        <section className="border-b border-line py-5">
          <h3 className="text-sm font-extrabold text-ink">Billing Details</h3>
          {overdue ? <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm font-bold text-danger">Expected payment is overdue.</p> : null}
          <dl className="mt-3 grid gap-3 text-sm">
            <DetailRow label="Amount" value={money(record.amount)} />
            <DetailRow label="Submitted Date" value={record.billing_submitted_date ? formatDate(record.billing_submitted_date) : "Not submitted"} />
            <DetailRow label="Expected Payment" value={record.expected_payment_date ? formatDate(record.expected_payment_date) : "Not set"} />
            <DetailRow label="Actual Payment" value={record.actual_payment_date ? formatDate(record.actual_payment_date) : "Not paid"} />
            <DetailRow label="Payment Progress" value={daysUntil === null ? "No expected payment date" : record.billing_status === "Paid" ? "Paid" : daysUntil >= 0 ? `${daysUntil} day(s) remaining` : `${Math.abs(daysUntil)} day(s) overdue`} />
          </dl>
        </section>
        <DetailSection title="Remarks / Notes" rows={[["Remarks", record.remarks || "No remarks added."]]} />
        {isAdmin ? <Button className="mt-5 w-full" variant="danger" onClick={() => onDelete(record)}><Trash2 className="h-4 w-4" /> Delete Billing Record</Button> : null}
      </div>
    </aside>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-slate-50 p-4">
      <h3 className="mb-4 text-sm font-extrabold text-ink">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  error
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-ink">
      {label}{required ? <span className="sr-only">required</span> : null}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn("focus-ring min-h-11 rounded-md bg-white text-sm", error ? "border-red-300 ring-1 ring-red-200" : "border-line")}
        aria-invalid={Boolean(error)}
        required={required}
      />
      {error ? <span className="text-xs font-bold text-danger">{error}</span> : null}
    </label>
  );
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-ink md:col-span-2">
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} className="focus-ring min-h-24 rounded-md border-line bg-white text-sm" />
    </label>
  );
}

function DetailSection({ title, rows }: { title: string; rows: Array<[string, React.ReactNode]> }) {
  return (
    <section className="border-b border-line py-5">
      <h3 className="text-sm font-extrabold text-ink">{title}</h3>
      <dl className="mt-3 grid gap-3 text-sm">
        {rows.map(([label, value]) => <DetailRow key={label} label={label} value={value} />)}
      </dl>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3">
      <dt className="font-semibold text-muted">{label}</dt>
      <dd className="break-words text-ink">{value}</dd>
    </div>
  );
}
