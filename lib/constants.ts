import {
  ClipboardList,
  ContactRound,
  CalendarDays,
  FileText,
  Gauge,
  Hammer,
  HelpCircle,
  Package,
  ReceiptText,
  UserRoundCog,
  Users
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
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/inquiries", label: "Inquiries", icon: ContactRound },
  { href: "/admin/service-schedule", label: "Service Schedule", icon: CalendarDays },
  { href: "/admin/quotation-builder", label: "Quotation Builder", icon: ClipboardList },
  { href: "/admin/quotations", label: "Quotations", icon: ReceiptText },
  { href: "/admin/labor-items", label: "Labor Items", icon: Hammer },
  { href: "/admin/parts-items", label: "Parts Items", icon: Package },
  { href: "/admin/service-templates", label: "Service Templates", icon: FileText },
  { href: "/admin/help", label: "Help / User Guide", icon: HelpCircle },
  { href: "/admin/settings", label: "Settings", icon: UserRoundCog }
] as const;
