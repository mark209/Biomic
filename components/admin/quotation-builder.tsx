"use client";

import { Calculator, Layers3, Plus, Save, Sparkles, Trash2, UserRound, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "./admin-page-header";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import type { CatalogRow, Database } from "@/lib/database.types";
import { makeDateScopedReference } from "@/lib/reference";
import { getSafeErrorMessage } from "@/lib/security";
import { createClient } from "@/lib/supabase/client";
import { formatDate, money } from "@/lib/utils";
import { quoteTotals } from "@/lib/calculations";
import { findDuplicateCustomers, findMatchingTemplate } from "@/lib/service-workflow";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Inquiry = Database["public"]["Tables"]["inquiries"]["Row"];
type Template = Database["public"]["Tables"]["service_templates"]["Row"];
type TemplateItem = Database["public"]["Tables"]["service_template_items"]["Row"];

type BuilderLine = {
  id: string;
  item_type: "labor" | "part" | "custom_labor" | "custom_part";
  source_labor_item_id: string | null;
  source_part_item_id: string | null;
  name_snapshot: string;
  description_snapshot: string | null;
  quantity: number;
  unit_price: number;
};

const defaultTerms = "Quotation is subject to site inspection, actual unit condition, and parts availability. Prices are valid for 15 days unless otherwise stated.";

function StepTitle({ step, title, icon: Icon }: { step: number; title: string; icon: LucideIcon }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-md bg-primary-100 text-primary-800">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs font-extrabold uppercase tracking-wide text-primary-700">Step {step}</p>
        <h2 className="text-lg font-bold text-ink">{title}</h2>
      </div>
    </div>
  );
}

export function QuotationBuilder() {
  const params = useSearchParams();
  const inquiryId = params.get("inquiry");
  const customerIdParam = params.get("customer");
  const serviceTypeParam = params.get("service");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateItems, setTemplateItems] = useState<TemplateItem[]>([]);
  const [labor, setLabor] = useState<CatalogRow[]>([]);
  const [parts, setParts] = useState<CatalogRow[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(defaultTerms);
  const [lines, setLines] = useState<BuilderLine[]>([]);
  const [savedQuotationNumber, setSavedQuotationNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestedServiceType, setRequestedServiceType] = useState("");
  const [autoTemplateMessage, setAutoTemplateMessage] = useState<string | null>(null);
  const [customer, setCustomer] = useState({
    customer_id: "",
    inquiry_id: "",
    customer_name: "",
    contact_number: "",
    email: "",
    address: ""
  });

  async function load() {
    const supabase = createClient();
    const [customerResult, inquiryResult, templateResult, templateItemResult, laborResult, partsResult] = await Promise.all([
      supabase.from("customers").select("*").order("name"),
      supabase.from("inquiries").select("*").order("created_at", { ascending: false }),
      supabase.from("service_templates").select("*").eq("is_active", true).order("name"),
      supabase.from("service_template_items").select("*").order("sort_order"),
      supabase.from("labor_items").select("*").eq("is_active", true).order("name"),
      supabase.from("parts_items").select("*").eq("is_active", true).order("name")
    ]);
    if (customerResult.error) setError(getSafeErrorMessage("load quotation data"));
    const loadedCustomers = (customerResult.data ?? []) as Customer[];
    const loadedInquiries = (inquiryResult.data ?? []) as Inquiry[];
    const loadedTemplates = (templateResult.data ?? []) as Template[];
    const loadedTemplateItems = (templateItemResult.data ?? []) as TemplateItem[];
    setCustomers(loadedCustomers);
    setInquiries(loadedInquiries);
    setTemplates(loadedTemplates);
    setTemplateItems(loadedTemplateItems);
    setLabor((laborResult.data ?? []) as CatalogRow[]);
    setParts((partsResult.data ?? []) as CatalogRow[]);

    const linkedInquiry = loadedInquiries.find((inquiry) => inquiry.id === inquiryId);
    const linkedCustomer = loadedCustomers.find((item) => item.id === customerIdParam);
    if (linkedInquiry) {
      selectInquiry(linkedInquiry);
      autoLoadTemplateForService(linkedInquiry.service_type, loadedTemplates, loadedTemplateItems);
    } else if (linkedCustomer) {
      applyCustomer(linkedCustomer);
      if (serviceTypeParam) autoLoadTemplateForService(serviceTypeParam, loadedTemplates, loadedTemplateItems);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => quoteTotals(lines.map((line) => ({ quantity: line.quantity, unit_price: line.unit_price })), discount), [lines, discount]);
  const duplicateCustomers = useMemo(() => {
    if (customer.customer_id) return [];
    return findDuplicateCustomers(customers, { contact_number: customer.contact_number, email: customer.email });
  }, [customers, customer.customer_id, customer.contact_number, customer.email]);

  function applyCustomer(found: Customer) {
    setRequestedServiceType("");
    setAutoTemplateMessage(null);
    setCustomer({
      customer_id: found.id,
      inquiry_id: "",
      customer_name: found.name,
      contact_number: found.contact_number,
      email: found.email ?? "",
      address: found.address
    });
  }

  function selectInquiry(inquiry: Inquiry) {
    setRequestedServiceType(inquiry.service_type);
    setCustomer({
      customer_id: inquiry.customer_id ?? "",
      inquiry_id: inquiry.id,
      customer_name: inquiry.customer_name,
      contact_number: inquiry.contact_number,
      email: inquiry.email ?? "",
      address: inquiry.address
    });
  }

  function templateItemsToLines(templateId: string, sourceItems = templateItems) {
    return sourceItems
      .filter((item) => item.service_template_id === templateId)
      .map<BuilderLine>((item) => ({
        id: crypto.randomUUID(),
        item_type: item.item_type,
        source_labor_item_id: item.labor_item_id,
        source_part_item_id: item.part_item_id,
        name_snapshot: item.name_snapshot,
        description_snapshot: item.description_snapshot,
        quantity: Number(item.default_quantity),
        unit_price: Number(item.default_unit_price)
      }));
  }

  function loadTemplate(templateId: string) {
    setSelectedTemplate(templateId);
    setAutoTemplateMessage(null);
    const loaded = templateItemsToLines(templateId);
    setLines(loaded);
  }

  function autoLoadTemplateForService(serviceType: string, sourceTemplates = templates, sourceItems = templateItems) {
    setRequestedServiceType(serviceType);
    const matched = findMatchingTemplate(sourceTemplates, serviceType);
    if (!matched) {
      setSelectedTemplate("");
      setAutoTemplateMessage(`No matching template found for ${serviceType}. Please select a template manually.`);
      return;
    }
    setSelectedTemplate(matched.id);
    setLines(templateItemsToLines(matched.id, sourceItems));
    setAutoTemplateMessage(`Template auto-applied from customer's requested service: ${serviceType}`);
  }

  function addCatalogLine(type: "labor" | "part", id: string) {
    const source = type === "labor" ? labor.find((item) => item.id === id) : parts.find((item) => item.id === id);
    if (!source) return;
    setLines((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        item_type: type,
        source_labor_item_id: type === "labor" ? source.id : null,
        source_part_item_id: type === "part" ? source.id : null,
        name_snapshot: source.name,
        description_snapshot: source.description,
        quantity: 1,
        unit_price: Number(source.default_price)
      }
    ]);
  }

  function addCustomLine(type: "custom_labor" | "custom_part") {
    setLines((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        item_type: type,
        source_labor_item_id: null,
        source_part_item_id: null,
        name_snapshot: type === "custom_labor" ? "Custom Labor Item" : "Custom Parts Item",
        description_snapshot: null,
        quantity: 1,
        unit_price: 0
      }
    ]);
  }

  function updateLine(id: string, patch: Partial<BuilderLine>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  async function saveQuotation() {
    setError(null);
    setSavedQuotationNumber(null);

    if (!customer.customer_name || !customer.contact_number || !customer.address) {
      setError("Customer name, contact number, and address are required.");
      return;
    }
    if (!lines.length) {
      setError("Add at least one labor or parts item.");
      return;
    }

    const supabase = createClient();
    const quotationNumber = makeDateScopedReference("QT");
    const {
      data: { user }
    } = await supabase.auth.getUser();

    let customerId = customer.customer_id || null;
    let resolvedCustomer: Customer | null = null;
    if (!customerId) {
      const duplicate = findDuplicateCustomers(customers, { contact_number: customer.contact_number, email: customer.email })[0];
      if (duplicate) {
        customerId = duplicate.id;
        resolvedCustomer = duplicate;
        setCustomer((current) => ({
          ...current,
          customer_id: duplicate.id,
          customer_name: duplicate.name,
          contact_number: duplicate.contact_number,
          email: duplicate.email ?? current.email,
          address: duplicate.address
        }));
      } else {
        const { data: createdCustomer, error: customerError } = await (supabase as any)
          .from("customers")
          .insert({
            name: customer.customer_name,
            contact_number: customer.contact_number,
            email: customer.email || null,
            address: customer.address
          })
          .select()
          .single();

        if (customerError) {
          setError(getSafeErrorMessage("create the customer"));
          return;
        }
        resolvedCustomer = createdCustomer as Customer;
        customerId = resolvedCustomer.id;
        setCustomers((current) => [resolvedCustomer as Customer, ...current]);
        setCustomer((current) => ({
          ...current,
          customer_id: resolvedCustomer?.id ?? current.customer_id
        }));
      }
    } else {
      resolvedCustomer = customers.find((item) => item.id === customerId) ?? null;
    }

    const { data: quotation, error: quotationError } = await (supabase as any)
      .from("quotations")
      .insert({
        quotation_number: quotationNumber,
        inquiry_id: customer.inquiry_id || null,
        customer_id: customerId,
        customer_name: customer.customer_name,
        contact_number: customer.contact_number,
        email: customer.email || null,
        address: customer.address,
        status: "Draft",
        subtotal: totals.subtotal,
        discount: totals.discount,
        grand_total: totals.grandTotal,
        notes: notes || null,
        terms: terms || null,
        prepared_by: user?.id ?? null
      })
      .select()
      .single();

    if (quotationError) {
      setError(getSafeErrorMessage("save the quotation"));
      return;
    }

    const quoteItems = lines.map((line, index) => ({
      quotation_id: quotation.id,
      item_type: line.item_type,
      source_labor_item_id: line.source_labor_item_id,
      source_part_item_id: line.source_part_item_id,
      name_snapshot: line.name_snapshot,
      description_snapshot: line.description_snapshot,
      quantity: line.quantity,
      unit_price: line.unit_price,
      line_total: line.quantity * line.unit_price,
      sort_order: index + 1
    }));

    const { error: itemError } = await (supabase as any).from("quotation_items").insert(quoteItems);
    if (itemError) {
      setError(getSafeErrorMessage("save quotation line items"));
      return;
    }

    if (customer.inquiry_id && customerId) {
      const { error: inquiryUpdateError } = await (supabase as any)
        .from("inquiries")
        .update({
          status: "Quoted",
          customer_id: customerId,
          customer_name: resolvedCustomer?.name ?? customer.customer_name,
          contact_number: resolvedCustomer?.contact_number ?? customer.contact_number,
          email: resolvedCustomer?.email ?? (customer.email || null),
          address: resolvedCustomer?.address ?? customer.address
        })
        .eq("id", customer.inquiry_id);

      if (inquiryUpdateError) {
        setError("Quotation was saved, but the inquiry customer could not be moved to Customers. Please review the inquiry manually.");
        return;
      }

      setInquiries((current) =>
        current.map((inquiry) =>
          inquiry.id === customer.inquiry_id
            ? {
                ...inquiry,
                status: "Quoted",
                customer_id: customerId,
                customer_name: resolvedCustomer?.name ?? customer.customer_name,
                contact_number: resolvedCustomer?.contact_number ?? customer.contact_number,
                email: resolvedCustomer?.email ?? (customer.email || null),
                address: resolvedCustomer?.address ?? customer.address
              }
            : inquiry
        )
      );
    }

    setSavedQuotationNumber(quotationNumber);
    setLines([]);
    setSelectedTemplate("");
    setDiscount(0);
  }

  return (
    <section>
      <AdminPageHeader title="Quotation Builder" description="Create snapshot-based quotations from inquiries, customers, templates, and custom items." />
      {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-danger">{error}</div> : null}
      <Modal title="Quotation saved" open={Boolean(savedQuotationNumber)} onClose={() => setSavedQuotationNumber(null)}>
        <div className="grid gap-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-success">
              Quotation {savedQuotationNumber} saved successfully. Customer is now available in Customers.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setSavedQuotationNumber(null)}>
              Close
            </Button>
            {savedQuotationNumber ? (
              <Link href={`/admin/quotations?search=${encodeURIComponent(savedQuotationNumber)}`}>
                <Button>View saved quotation</Button>
              </Link>
            ) : null}
          </div>
        </div>
      </Modal>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
        <div className="admin-panel min-w-0 p-5">
          <StepTitle step={1} title="Customer" icon={UserRound} />
          <div className="mt-4 grid min-w-0 gap-4">
            <Select label="Select existing inquiry" value={customer.inquiry_id} onChange={(event) => {
              const found = inquiries.find((item) => item.id === event.target.value);
              if (found) {
                selectInquiry(found);
                autoLoadTemplateForService(found.service_type);
              }
            }}>
              <option value="">No inquiry selected</option>
              {inquiries.map((item) => <option key={item.id} value={item.id}>{item.reference_number} - {item.customer_name}</option>)}
            </Select>
            <Input label="Customer name" value={customer.customer_name} onChange={(event) => setCustomer({ ...customer, customer_name: event.target.value })} />
            {duplicateCustomers.length ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                Matching customer found: {duplicateCustomers[0].name}. Saving will use the existing customer record to avoid duplicates.
              </div>
            ) : null}
            {requestedServiceType ? (
              <div className="rounded-lg border border-primary-100 bg-primary-50 p-3 text-sm">
                <span className="font-bold text-primary-900">Requested service type</span>
                <p className="mt-1 text-primary-800">{requestedServiceType}</p>
              </div>
            ) : null}
            <Input label="Contact number" value={customer.contact_number} onChange={(event) => setCustomer({ ...customer, contact_number: event.target.value })} />
            <Input label="Email optional" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} />
            <Textarea label="Address" value={customer.address} onChange={(event) => setCustomer({ ...customer, address: event.target.value })} />
          </div>
        </div>

        <div className="admin-panel min-w-0 p-5">
          <StepTitle step={2} title="Service Template" icon={Layers3} />
          {autoTemplateMessage ? (
            <div className={`mt-4 flex gap-2 rounded-md border p-3 text-sm font-semibold ${autoTemplateMessage.startsWith("No matching") ? "border-amber-200 bg-amber-50 text-amber-900" : "border-primary-200 bg-primary-50 text-primary-900"}`}>
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{autoTemplateMessage}</span>
            </div>
          ) : null}
          <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-3">
            <Select label="Service template" value={selectedTemplate} onChange={(event) => loadTemplate(event.target.value)}>
              <option value="">No template</option>
              {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </Select>
            <Select label="Add labor" defaultValue="" onChange={(event) => addCatalogLine("labor", event.target.value)}>
              <option value="">Select labor</option>
              {labor.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
            <Select label="Add part" defaultValue="" onChange={(event) => addCatalogLine("part", event.target.value)}>
              <option value="">Select part</option>
              {parts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => addCustomLine("custom_labor")}><Plus className="h-4 w-4" /> Custom labor</Button>
            <Button variant="outline" size="sm" onClick={() => addCustomLine("custom_part")}><Plus className="h-4 w-4" /> Custom part</Button>
          </div>

          <div className="mt-6 border-t border-line pt-5">
            <StepTitle step={3} title="Labor & Parts" icon={Wrench} />
          </div>
          <div className="mt-5 grid max-h-[28rem] min-w-0 gap-3 overflow-y-auto pr-1 xl:max-h-[34rem]">
            {lines.map((line) => (
              <div key={line.id} className="grid min-w-0 gap-3 rounded-lg border border-line bg-slate-50 p-3 lg:grid-cols-[minmax(0,1fr)_6rem_8rem_8rem_auto] lg:items-end">
                <Input label="Item" value={line.name_snapshot} onChange={(event) => updateLine(line.id, { name_snapshot: event.target.value })} />
                <Input label="Qty" type="number" step="0.01" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: Number(event.target.value) })} />
                <Input label="Unit price" type="number" step="0.01" value={line.unit_price} onChange={(event) => updateLine(line.id, { unit_price: Number(event.target.value) })} />
                <div className="pb-2 text-sm font-bold text-ink">{money(line.quantity * line.unit_price)}</div>
                <Button variant="danger" size="sm" aria-label={`Remove ${line.name_snapshot}`} onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {!lines.length ? <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">Load a template or add labor/parts items.</p> : null}
          </div>
        </div>
      </div>

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="admin-panel grid min-w-0 gap-4 p-5">
          <Textarea label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
          <Textarea label="Terms and conditions" value={terms} onChange={(event) => setTerms(event.target.value)} />
        </div>
        <div className="admin-panel h-fit p-5 xl:sticky xl:top-20">
          <StepTitle step={4} title="Summary" icon={Calculator} />
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Date</dt><dd className="font-bold">{formatDate(new Date().toISOString())}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="font-bold">{money(totals.subtotal)}</dd></div>
            <div className="grid gap-1">
              <Input label="Discount" type="number" step="0.01" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} />
            </div>
            <div className="rounded-lg border border-primary-200 bg-primary-50 p-3">
              <div className="flex justify-between text-base"><dt className="font-bold text-ink">Grand total</dt><dd className="text-xl font-extrabold text-primary-800">{money(totals.grandTotal)}</dd></div>
            </div>
          </dl>
          <Button className="mt-5 w-full" size="lg" onClick={saveQuotation}>
            <Save className="h-4 w-4" />
            Save quotation
          </Button>
        </div>
      </div>
    </section>
  );
}
