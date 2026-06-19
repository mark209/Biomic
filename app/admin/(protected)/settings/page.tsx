import { Building2, CalendarDays, FileText, ShieldCheck } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

const serviceCenterInfo = [
  ["Business name", "Daikin Authorized Service Center"],
  ["Branch name", "Service Center Pro"],
  ["Contact email", "admin@daikin.com"],
  ["Contact number", "Not set"],
  ["Office address", "Not set"]
];

const documentDefaults = [
  ["Quotation validity", "15 days"],
  ["Default quotation status", "Draft"],
  ["Currency", "PHP"],
  ["Inquiry reference format", "DAI-YYYY-MMDD-####"],
  ["Quotation reference format", "QT-YYYY-MMDD-####"]
];

const scheduleDefaults = [
  ["Reminder window", "Services due within 7 days"],
  ["Default service status", "Scheduled"]
];

const accessDefaults = [
  ["Admin users", "Managed by authorized staff"],
  ["Account access", "Use your assigned admin email and password"],
  ["Session safety", "Sign out after using a shared office computer"]
];

export default function SettingsPage() {
  return (
    <section>
      <AdminPageHeader
        title="Settings"
        description="Manage basic service center preferences and document defaults."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <SettingsCard
          icon={<Building2 className="h-5 w-5" />}
          title="Service Center Information"
          description="Basic office details shown for staff reference."
          rows={serviceCenterInfo}
        />

        <SettingsCard
          icon={<FileText className="h-5 w-5" />}
          title="Document Defaults"
          description="Default values used when preparing documents."
          rows={documentDefaults}
        />

        <SettingsCard
          icon={<CalendarDays className="h-5 w-5" />}
          title="Schedule Defaults"
          description="Standard scheduling preferences for service work."
          rows={scheduleDefaults}
        />

        <SettingsCard
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Account & Access"
          description="Simple account access notes for office users."
          rows={accessDefaults}
        />
      </div>
    </section>
  );
}

function SettingsCard({
  icon,
  title,
  description,
  rows
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  rows: string[][];
}) {
  return (
    <section className="admin-panel p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary-100 text-primary-800">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="font-bold text-ink">{title}</h2>
          <p className="mt-1 text-sm leading-5 text-muted">{description}</p>
        </div>
      </div>

      <dl className="mt-5 grid gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-line bg-slate-50 px-4 py-3">
            <dt className="text-xs font-extrabold uppercase tracking-wide text-muted">{label}</dt>
            <dd className="mt-1 break-words text-sm font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
