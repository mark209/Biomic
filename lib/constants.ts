import {
  ContactRound,
  CircleDollarSign,
  Gauge,
  HelpCircle,
  Package,
  ReceiptText,
  UserRoundCog
} from "lucide-react";

export const inquiryStatuses = [
  "New",
  "Under Review",
  "Quoted",
  "Approved",
  "Scheduled",
  "Completed",
  "Cancelled"
] as const;

export const quotationStatuses = ["Draft", "Sent", "Approved", "Rejected", "Completed"] as const;

export const recurrenceTypes = ["none", "monthly", "quarterly", "semi_annual", "annual"] as const;

export const serviceScheduleStatuses = ["active", "paused", "completed", "cancelled"] as const;

export const hqBillingStatuses = ["For Billing", "Billed", "Backjob", "Pending Payment", "Paid"] as const;

export const notificationTypes = [
  "new_website_inquiry",
  "new_customer_inquiry",
  "monthly_service_due_soon",
  "overdue_service",
  "quotation_approved",
  "quotation_needs_follow_up"
] as const;

export const serviceTypes = [
  "Aircon Cleaning",
  "Chemical Cleaning",
  "Repair",
  "Preventive Maintenance",
  "Diagnostics & Repair",
  "Installation",
  "Annual Maintenance Contract"
] as const;

export const airconTypes = [
  "Wall-mounted Split",
  "Window Type",
  "Ceiling Cassette",
  "Floor Mounted",
  "Ducted",
  "VRV / VRF",
  "Other"
] as const;

export const adminNav = [
  { href: "/admin", label: "Dashboard", icon: Gauge },
  { href: "/admin/service-desk", label: "Service Desk", icon: ContactRound, match: ["/admin/service-desk", "/admin/customers", "/admin/inquiries", "/admin/service-schedule"] },
  { href: "/admin/quotations", label: "Quotations", icon: ReceiptText },
  { href: "/admin/item-library", label: "Item Library", icon: Package, match: ["/admin/item-library", "/admin/labor-items", "/admin/parts-items", "/admin/service-templates"] },
  { href: "/admin/hq-billing", label: "PO / GR Records", icon: CircleDollarSign },
  { href: "/admin/help", label: "Help / User Guide", icon: HelpCircle },
  { href: "/admin/settings", label: "Settings", icon: UserRoundCog }
] as const;
