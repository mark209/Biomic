import { CheckCircle2, FileText, LockKeyhole, LogOut, Settings, ShieldCheck } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

const setupItems = [
  "Supabase Auth protects all admin pages.",
  "Public visitors can only submit service inquiries.",
  "Quotation PDFs use saved snapshot values, so old quotations do not change when prices are updated.",
  "Service schedules and notifications are visible only to signed-in staff."
];

const officeDefaults = [
  ["Quotation validity", "15 days unless changed in quotation terms"],
  ["Default quotation status", "Draft"],
  ["Inquiry reference format", "DAI-YYYY-MMDD-####"],
  ["Quotation reference format", "QT-YYYY-MMDD-####"],
  ["Currency shown in PDFs", "PHP"],
  ["Schedule reminder window", "Services due within 7 days"]
];

export default function SettingsPage() {
  return (
    <section>
      <AdminPageHeader
        title="Settings"
        description="Operational settings and quick reference for office staff."
      />

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-5">
          <section className="admin-panel p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-primary-100 text-primary-800">
                <Settings className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-bold text-ink">Service Center Profile</h2>
                <p className="text-sm text-muted">Information used across admin workflows and quotation documents.</p>
              </div>
            </div>
            <dl className="mt-5 grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-lg border border-line bg-slate-50 p-3">
                <dt className="font-bold text-ink">Business name</dt>
                <dd className="mt-1 text-muted">Daikin Authorized Service Center</dd>
              </div>
              <div className="rounded-lg border border-line bg-slate-50 p-3">
                <dt className="font-bold text-ink">System purpose</dt>
                <dd className="mt-1 text-muted">Inquiries, customers, schedules, and quotations</dd>
              </div>
              <div className="rounded-lg border border-line bg-slate-50 p-3">
                <dt className="font-bold text-ink">PDF header</dt>
                <dd className="mt-1 text-muted">Company name with logo placeholder</dd>
              </div>
              <div className="rounded-lg border border-line bg-slate-50 p-3">
                <dt className="font-bold text-ink">Admin users</dt>
                <dd className="mt-1 text-muted">Managed in Supabase Auth</dd>
              </div>
            </dl>
          </section>

          <section className="admin-panel p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-emerald-100 text-emerald-800">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-bold text-ink">Office Defaults</h2>
                <p className="text-sm text-muted">Current defaults used by the MVP.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {officeDefaults.map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1 rounded-lg border border-line bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-bold text-ink">{label}</span>
                  <span className="text-sm text-muted">{value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-5">
          <section className="admin-panel p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-primary-100 text-primary-800">
                <LogOut className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-bold text-ink">Where to Sign Out</h2>
                <p className="text-sm text-muted">Use sign out when leaving a shared office computer.</p>
              </div>
            </div>
            <ol className="mt-5 grid list-decimal gap-2 pl-5 text-sm leading-6 text-muted">
              <li>On desktop, use the **Sign out** button in the top-right header or bottom-left sidebar.</li>
              <li>On mobile, tap the menu button, then tap **Sign out** at the bottom of the menu.</li>
              <li>After signing out, the system returns to the admin login page.</li>
            </ol>
          </section>

          <section className="admin-panel p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-emerald-100 text-emerald-800">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-bold text-ink">Security Checklist</h2>
                <p className="text-sm text-muted">Current production safeguards.</p>
              </div>
            </div>
            <ul className="mt-5 grid gap-3">
              {setupItems.map((item) => (
                <li key={item} className="flex gap-3 rounded-lg border border-line bg-slate-50 p-3 text-sm text-muted">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="admin-panel p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-amber-100 text-amber-800">
                <LockKeyhole className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-bold text-ink">Environment Keys</h2>
                <p className="text-sm text-muted">These are configured outside the app before deployment.</p>
              </div>
            </div>
            <div className="mt-5 rounded-md bg-slate-100 p-3 font-mono text-xs leading-6 text-muted">
              NEXT_PUBLIC_SUPABASE_URL<br />
              NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">
              Do not place service-role or secret keys in the frontend.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
