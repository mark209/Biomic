"use client";

import { CalendarDays, ClipboardList, ExternalLink, FileImage, FileText, Inbox, Search, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "./admin-page-header";
import { Button } from "@/components/ui/button";
import { CustomerBadges } from "@/components/ui/customer-badges";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Database } from "@/lib/database.types";
import { getSafeErrorMessage } from "@/lib/security";
import { createClient } from "@/lib/supabase/client";
import { formatDate, money } from "@/lib/utils";
import { badgesForCustomer, contactKey, getScheduleWindow, recurrenceLabels, scheduleWindowLabel } from "@/lib/service-workflow";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Inquiry = Database["public"]["Tables"]["inquiries"]["Row"];
type Quotation = Database["public"]["Tables"]["quotations"]["Row"];
type Schedule = Database["public"]["Tables"]["service_schedules"]["Row"];

type CustomerDocument = {
  path: string;
  name: string;
  title: string;
  size: number | null;
  updatedAt: string | null;
  signedUrl: string | null;
};

type StorageFile = {
  name: string;
  updated_at?: string | null;
  created_at?: string | null;
  metadata?: {
    size?: number;
    title?: string;
    [key: string]: unknown;
  } | null;
};

const CUSTOMER_DOCUMENT_FOLDER = "customer-documents";
const CUSTOMER_DOCUMENT_BUCKET = "inquiry-photos";
const MAX_CUSTOMER_DOCUMENT_BYTES = 12 * 1024 * 1024;
const COMPRESSED_IMAGE_MAX_EDGE = 1400;
const COMPRESSED_IMAGE_QUALITY = 0.72;

function formatScheduleTime(value: string | null | undefined) {
  if (!value) return "Time not set";
  const [hours = "0", minutes = "0"] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date);
}

function formatScheduleDateTime(schedule: Pick<Schedule, "next_service_date" | "scheduled_time">) {
  return `${formatDate(schedule.next_service_date)} - ${formatScheduleTime(schedule.scheduled_time)}`;
}

function timelineMarkerClass(status: string) {
  if (["Completed", "Approved", "active", "completed"].includes(status)) return "bg-emerald-100 text-emerald-800";
  if (["OVERDUE", "Rejected"].includes(status)) return "bg-red-100 text-red-800";
  if (["UPCOMING", "Under Review"].includes(status)) return "bg-amber-100 text-amber-800";
  if (["Scheduled", "SCHEDULED"].includes(status)) return "bg-indigo-100 text-indigo-800";
  if (status === "Quoted") return "bg-purple-100 text-purple-800";
  return "bg-primary-100 text-primary-800";
}

function documentFolder(customerId: string) {
  return `${CUSTOMER_DOCUMENT_FOLDER}/${customerId}`;
}

function slugifyTitle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "document";
}

function titleFromFileName(name: string) {
  const baseName = name.replace(/\.[^.]+$/, "").split("--")[0] ?? "document";
  return baseName
    .replace(/[-_]+/g, " ")
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function formatFileSize(value: number | null) {
  if (!value) return "Compressed image";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function readImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Invalid image"));
    };
    image.src = url;
  });
}

async function compressCustomerDocument(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Upload a JPG, PNG, or WebP image.");
  }
  if (file.size <= 0 || file.size > MAX_CUSTOMER_DOCUMENT_BYTES) {
    throw new Error("Upload an image smaller than 12 MB.");
  }

  const image = await readImage(file);
  const scale = Math.min(1, COMPRESSED_IMAGE_MAX_EDGE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to compress this image.");
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", COMPRESSED_IMAGE_QUALITY));
  if (!blob) throw new Error("Unable to compress this image.");
  return blob;
}

export function CustomerProfile({ customerId }: { customerId: string }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentSearch, setDocumentSearch] = useState("");
  const [documentBusy, setDocumentBusy] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadDocuments() {
    const supabase = createClient();
    const folder = documentFolder(customerId);
    const { data, error: listError } = await supabase.storage.from(CUSTOMER_DOCUMENT_BUCKET).list(folder, {
      limit: 100,
      sortBy: { column: "updated_at", order: "desc" }
    });

    if (listError) {
      setDocumentError(getSafeErrorMessage("load customer attachments"));
      return;
    }

    const files = ((data ?? []) as StorageFile[]).filter((item) => item.name && item.name !== ".emptyFolderPlaceholder");
    const loaded = await Promise.all(
      files.map(async (file) => {
        const path = `${folder}/${file.name}`;
        const { data: signed } = await supabase.storage.from(CUSTOMER_DOCUMENT_BUCKET).createSignedUrl(path, 60 * 10);
        return {
          path,
          name: file.name,
          title: typeof file.metadata?.title === "string" ? file.metadata.title : titleFromFileName(file.name),
          size: typeof file.metadata?.size === "number" ? file.metadata.size : null,
          updatedAt: file.updated_at ?? file.created_at ?? null,
          signedUrl: signed?.signedUrl ?? null
        };
      })
    );
    setDocuments(loaded);
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [customerResult, inquiryResult, quoteResult, scheduleResult] = await Promise.all([
        supabase.from("customers").select("*").eq("id", customerId).single(),
        supabase.from("inquiries").select("*").order("created_at", { ascending: false }),
        supabase.from("quotations").select("*").order("created_at", { ascending: false }),
        supabase.from("service_schedules").select("*").eq("customer_id", customerId).order("next_service_date", { ascending: true })
      ]);
      if (customerResult.error) setError(getSafeErrorMessage("load the customer profile"));
      const loadedCustomer = customerResult.data as Customer | null;
      setCustomer(loadedCustomer);
      const customerPhone = contactKey(loadedCustomer?.contact_number);
      setInquiries(((inquiryResult.data ?? []) as Inquiry[]).filter((inquiry) => inquiry.customer_id === customerId || contactKey(inquiry.contact_number) === customerPhone));
      setQuotations(((quoteResult.data ?? []) as Quotation[]).filter((quote) => quote.customer_id === customerId || contactKey(quote.contact_number) === customerPhone));
      setSchedules((scheduleResult.data ?? []) as Schedule[]);
      await loadDocuments();
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
      { date: schedule.created_at, title: "Service scheduled", detail: `${schedule.service_type} - ${formatScheduleDateTime(schedule)}`, icon: CalendarDays, status: scheduleWindowLabel(getScheduleWindow(schedule)) },
      ...(schedule.last_service_date ? [{ date: schedule.last_service_date, title: "Service completed", detail: schedule.service_type, icon: CalendarDays, status: "Completed" }] : [])
    ]);
    return [...inquiryEvents, ...quoteEvents, ...scheduleEvents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [inquiries, quotations, schedules]);
  const filteredDocuments = documents.filter((document) => document.title.toLowerCase().includes(documentSearch.trim().toLowerCase()));

  async function uploadDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDocumentError(null);

    const title = documentTitle.trim();
    if (!title) {
      setDocumentError("Enter a title for this image.");
      return;
    }
    if (!documentFile) {
      setDocumentError("Choose an image to attach.");
      return;
    }

    setDocumentBusy(true);
    try {
      const compressed = await compressCustomerDocument(documentFile);
      const supabase = createClient();
      const path = `${documentFolder(customerId)}/${slugifyTitle(title)}--${crypto.randomUUID()}.webp`;
      const { error: uploadError } = await supabase.storage.from(CUSTOMER_DOCUMENT_BUCKET).upload(path, compressed, {
        cacheControl: "3600",
        contentType: "image/webp",
        metadata: { title, originalSize: documentFile.size, compressedSize: compressed.size },
        upsert: false
      });

      if (uploadError) {
        setDocumentError(getSafeErrorMessage("attach the customer image"));
        return;
      }

      setDocumentTitle("");
      setDocumentFile(null);
      const input = document.getElementById("customer-document-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await loadDocuments();
    } catch (caught) {
      setDocumentError(caught instanceof Error ? caught.message : getSafeErrorMessage("compress the image"));
    } finally {
      setDocumentBusy(false);
    }
  }

  async function removeDocument(documentPath: string) {
    setDocumentError(null);
    setDocumentBusy(true);
    const supabase = createClient();
    const { error: removeError } = await supabase.storage.from(CUSTOMER_DOCUMENT_BUCKET).remove([documentPath]);
    if (removeError) {
      setDocumentError(getSafeErrorMessage("remove the attachment"));
    } else {
      setDocuments((current) => current.filter((item) => item.path !== documentPath));
    }
    setDocumentBusy(false);
  }

  if (!customer && !error) return <p className="text-sm text-muted">Loading customer...</p>;

  return (
    <section>
      <AdminPageHeader
        title={customer?.name ?? "Customer Profile"}
        description="Customer details, history, quotations, and active service schedule."
        action={
          customer ? (
            <div className="flex flex-wrap gap-2">
              <Link href={`/admin/service-desk?tab=schedule&customer=${customer.id}`}><Button variant="outline"><CalendarDays className="h-4 w-4" /> Create Monthly Service</Button></Link>
              <Link href={`/admin/quotations?action=create&customer=${customer.id}`}><Button><FileText className="h-4 w-4" /> Create Quotation</Button></Link>
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
                    <p className="mt-1 text-sm text-muted">Next service: {formatScheduleDateTime(schedule)}</p>
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
                  <p className="mt-1 text-sm text-muted">{formatScheduleDateTime(nextService)}</p>
                </div>
              ) : <p className="mt-3 text-sm text-muted">No scheduled service.</p>}
            </section>
            <section className="admin-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-ink">Attached Images</h2>
                  <p className="mt-1 text-sm text-muted">Compressed photos of customer paperwork.</p>
                </div>
                <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-extrabold text-primary-800">{documents.length} files</span>
              </div>
              <form className="mt-4 grid gap-3 rounded-lg border border-line bg-slate-50 p-3" onSubmit={uploadDocument}>
                {documentError ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-danger">{documentError}</div> : null}
                <label className="grid gap-1 text-sm font-bold text-ink">
                  Image title
                  <input
                    value={documentTitle}
                    onChange={(event) => setDocumentTitle(event.target.value)}
                    placeholder="Warranty card, signed service form..."
                    className="focus-ring min-h-10 rounded-md border-line bg-white text-sm font-normal"
                  />
                </label>
                <label className="grid gap-1 text-sm font-bold text-ink">
                  Image file
                  <input
                    id="customer-document-file"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)}
                    className="min-h-10 w-full max-w-full text-sm file:mr-3 file:min-h-10 file:rounded-md file:border-0 file:bg-primary-100 file:px-3 file:py-2 file:font-bold file:text-primary-900"
                  />
                </label>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-muted">Images are resized to WebP before upload to save storage.</p>
                  <Button type="submit" size="sm" disabled={documentBusy}>
                    <Upload className="h-4 w-4" />
                    {documentBusy ? "Attaching..." : "Attach Image"}
                  </Button>
                </div>
              </form>
              <label className="relative mt-4 block">
                <span className="sr-only">Search attached images</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  value={documentSearch}
                  onChange={(event) => setDocumentSearch(event.target.value)}
                  placeholder="Search image titles"
                  className="focus-ring min-h-10 w-full rounded-md border-line bg-white pl-9 text-sm"
                />
              </label>
              <div className="mt-4 grid gap-3">
                {filteredDocuments.map((item) => (
                  <article key={item.path} className="grid gap-3 rounded-lg border border-line bg-white p-3 sm:grid-cols-[5rem_minmax(0,1fr)]">
                    <a href={item.signedUrl ?? "#"} target="_blank" rel="noreferrer" className="grid h-20 w-full place-items-center overflow-hidden rounded-md bg-slate-100 sm:w-20">
                      {item.signedUrl ? <img src={item.signedUrl} alt={item.title} className="h-full w-full object-cover" /> : <FileImage className="h-6 w-6 text-muted" />}
                    </a>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="break-words text-sm font-extrabold text-ink">{item.title}</h3>
                          <p className="mt-1 text-xs font-semibold text-muted">
                            {formatFileSize(item.size)}{item.updatedAt ? ` - ${formatDate(item.updatedAt)}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.signedUrl ? (
                          <a href={item.signedUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-2 rounded-md border border-line bg-white px-3 text-xs font-bold text-ink transition hover:bg-primary-50">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open
                          </a>
                        ) : null}
                        <Button size="sm" variant="ghost" className="min-h-9 px-3 text-xs text-danger hover:bg-red-50 hover:text-danger" disabled={documentBusy} onClick={() => removeDocument(item.path)}>
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
                {!filteredDocuments.length ? <p className="rounded-lg border border-dashed border-line p-4 text-sm text-muted">{documents.length ? "No attached images match your search." : "No attached images yet."}</p> : null}
              </div>
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
