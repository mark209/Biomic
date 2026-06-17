import type { Database } from "./database.types";

type Inquiry = Database["public"]["Tables"]["inquiries"]["Row"];
type Quotation = Database["public"]["Tables"]["quotations"]["Row"];
type Customer = Database["public"]["Tables"]["customers"]["Row"];
type ServiceSchedule = Database["public"]["Tables"]["service_schedules"]["Row"];
type ServiceTemplate = Database["public"]["Tables"]["service_templates"]["Row"];

export type CustomerBadge = "NEW CUSTOMER" | "RETURNING CUSTOMER" | "MONTHLY SERVICE" | "UPCOMING SERVICE";
export type ScheduleWindow = "today" | "upcoming" | "overdue" | "later";

const inquiryPriority: Record<string, number> = {
  New: 0,
  "Under Review": 1,
  Approved: 2,
  Scheduled: 3,
  Quoted: 4,
  Completed: 5,
  Cancelled: 6
};

const notificationPriority: Record<string, number> = {
  overdue_service: 0,
  monthly_service_due_soon: 1,
  new_customer_inquiry: 2,
  new_website_inquiry: 3,
  quotation_approved: 4,
  quotation_needs_follow_up: 5
};

export const recurrenceLabels: Record<string, string> = {
  none: "One-time",
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annual: "Semi-annual",
  annual: "Annual"
};

export function normalizeServiceType(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function serviceMatchesTemplate(template: ServiceTemplate, serviceType: string | null | undefined) {
  const requested = serviceTypeAlias(normalizeServiceType(serviceType));
  if (!requested) return false;
  const serviceKey = serviceTypeAlias(normalizeServiceType(template.service_type_key));
  const displayName = serviceTypeAlias(normalizeServiceType(template.display_name));
  const templateName = serviceTypeAlias(normalizeServiceType(template.name.replace(/template$/i, "")));
  return [serviceKey, displayName, templateName].filter(Boolean).some((value) => value === requested || value.includes(requested) || requested.includes(value));
}

function serviceTypeAlias(value: string) {
  if (value === "repair") return "diagnostics_and_repair";
  if (value === "preventive_maintenance") return "annual_maintenance_contract";
  if (value === "monthly_maintenance") return "annual_maintenance_contract";
  return value;
}

export function findMatchingTemplate(templates: ServiceTemplate[], serviceType: string | null | undefined) {
  return templates.find((template) => template.is_active && serviceMatchesTemplate(template, serviceType)) ?? null;
}

export function todayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function toDateOnly(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function daysUntil(value: string | null | undefined) {
  const date = toDateOnly(value);
  if (!date) return null;
  return Math.round((date.getTime() - todayStart().getTime()) / 86400000);
}

export function getScheduleWindow(schedule: Pick<ServiceSchedule, "next_service_date" | "status">): ScheduleWindow {
  if (schedule.status !== "active") return "later";
  const days = daysUntil(schedule.next_service_date);
  if (days === null) return "later";
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 7) return "upcoming";
  return "later";
}

export function nextServiceDateFrom(recurrenceType: string, baseDate = new Date()) {
  const next = new Date(baseDate);
  if (recurrenceType === "monthly") next.setMonth(next.getMonth() + 1);
  else if (recurrenceType === "quarterly") next.setMonth(next.getMonth() + 3);
  else if (recurrenceType === "semi_annual") next.setMonth(next.getMonth() + 6);
  else if (recurrenceType === "annual") next.setFullYear(next.getFullYear() + 1);
  return formatDateInput(next);
}

export function contactKey(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

export function emailKey(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function findDuplicateCustomers<T extends Pick<Customer, "id" | "contact_number" | "email">>(
  customers: T[],
  candidate: Pick<Customer, "contact_number"> & { email?: string | null },
  excludeCustomerId?: string | null
) {
  const candidatePhone = contactKey(candidate.contact_number);
  const candidateEmail = emailKey(candidate.email);

  return customers.filter((customer) => {
    if (excludeCustomerId && customer.id === excludeCustomerId) return false;
    const samePhone = Boolean(candidatePhone && contactKey(customer.contact_number) === candidatePhone);
    const sameEmail = Boolean(candidateEmail && emailKey(customer.email) === candidateEmail);
    return samePhone || sameEmail;
  });
}

export function sortInquiriesForOps<T extends Pick<Inquiry, "status" | "created_at">>(inquiries: T[]) {
  return [...inquiries].sort((a, b) => {
    const priorityDiff = (inquiryPriority[a.status] ?? 99) - (inquiryPriority[b.status] ?? 99);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function catalogUsageForItem(
  type: "labor" | "part",
  itemId: string,
  templateItems: Array<Pick<Database["public"]["Tables"]["service_template_items"]["Row"], "labor_item_id" | "part_item_id">>,
  quotationItems: Array<Pick<Database["public"]["Tables"]["quotation_items"]["Row"], "source_labor_item_id" | "source_part_item_id">>
) {
  const templateCount = templateItems.filter((item) => (type === "labor" ? item.labor_item_id : item.part_item_id) === itemId).length;
  const quotationCount = quotationItems.filter((item) => (type === "labor" ? item.source_labor_item_id : item.source_part_item_id) === itemId).length;
  return {
    isUsed: templateCount + quotationCount > 0,
    templateCount,
    quotationCount
  };
}

export function sortNotificationsForOps<T extends Pick<Database["public"]["Tables"]["notifications"]["Row"], "type" | "is_read" | "created_at">>(notifications: T[]) {
  return [...notifications].sort((a, b) => {
    if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
    const priorityDiff = (notificationPriority[a.type] ?? 99) - (notificationPriority[b.type] ?? 99);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function belongsToCustomer(record: { customer_id?: string | null; contact_number?: string | null; customer_name?: string | null }, customer: Pick<Customer, "id" | "name" | "contact_number">) {
  return record.customer_id === customer.id || (!!record.contact_number && contactKey(record.contact_number) === contactKey(customer.contact_number));
}

function belongsToInquiry(record: { customer_id?: string | null; contact_number?: string | null; customer_name?: string | null }, inquiry: Pick<Inquiry, "id" | "customer_id" | "contact_number" | "customer_name">) {
  return (
    (!!inquiry.customer_id && record.customer_id === inquiry.customer_id) ||
    (!!record.contact_number && contactKey(record.contact_number) === contactKey(inquiry.contact_number))
  );
}

export function badgesForInquiry(inquiry: Inquiry, inquiries: Inquiry[], quotations: Quotation[], schedules: ServiceSchedule[]): CustomerBadge[] {
  const previousInquiries = inquiries.filter((item) => item.id !== inquiry.id && belongsToInquiry(item, inquiry));
  const previousQuotes = quotations.filter((quote) => belongsToInquiry(quote, inquiry));
  const customerSchedules = schedules.filter((schedule) => inquiry.customer_id && schedule.customer_id === inquiry.customer_id);
  return buildCustomerBadges(previousInquiries.length + previousQuotes.length > 0, customerSchedules);
}

export function badgesForCustomer(customer: Customer, inquiries: Inquiry[], quotations: Quotation[], schedules: ServiceSchedule[]): CustomerBadge[] {
  const customerInquiries = inquiries.filter((inquiry) => belongsToCustomer(inquiry, customer));
  const customerQuotes = quotations.filter((quote) => belongsToCustomer(quote, customer));
  const customerSchedules = schedules.filter((schedule) => schedule.customer_id === customer.id);
  return buildCustomerBadges(customerInquiries.length + customerQuotes.length > 1, customerSchedules);
}

function buildCustomerBadges(hasHistory: boolean, schedules: ServiceSchedule[]): CustomerBadge[] {
  const badges: CustomerBadge[] = [hasHistory ? "RETURNING CUSTOMER" : "NEW CUSTOMER"];
  if (schedules.some((schedule) => schedule.status === "active" && schedule.recurrence_type === "monthly")) badges.push("MONTHLY SERVICE");
  if (schedules.some((schedule) => ["today", "upcoming"].includes(getScheduleWindow(schedule)))) badges.push("UPCOMING SERVICE");
  return badges;
}

export function scheduleWindowLabel(window: ScheduleWindow) {
  if (window === "today") return "TODAY";
  if (window === "upcoming") return "UPCOMING";
  if (window === "overdue") return "OVERDUE";
  return "SCHEDULED";
}
