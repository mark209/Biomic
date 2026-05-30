import { AdminPageHeader } from "./admin-page-header";

const guideSections = [
  ["How to log in", ["Open the admin login page.", "Enter your email and password.", "Click Sign in."]],
  ["How to view new inquiries", ["Open Inquiries.", "Look for New status.", "Click Quote when ready to prepare a quotation."]],
  ["How to identify new customers", ["Check the badges beside customer names.", "NEW CUSTOMER means no previous records.", "RETURNING CUSTOMER means the customer has history."]],
  ["How to create a manual inquiry", ["Open Inquiries.", "Click Manual inquiry.", "Fill in the customer and service details.", "Click Save inquiry."]],
  ["How to convert an inquiry into a quotation", ["Open Inquiries.", "Click Quote.", "Review the auto-filled customer and service details."]],
  ["How to use the quotation builder", ["Check customer details.", "Review loaded labor and parts.", "Edit quantities or prices if needed.", "Click Save quotation."]],
  ["How to download a quotation PDF", ["Open Quotations.", "Find the quotation.", "Click PDF."]],
  ["How to manage customers", ["Open Customers.", "Click View for the customer profile.", "Use Edit to update details."]],
  ["How to create a monthly service schedule", ["Open Service Schedule or a customer profile.", "Click New service schedule or Create Monthly Service.", "Choose Monthly recurrence.", "Save the schedule."]],
  ["How to mark a service as completed", ["Open Service Schedule.", "Click Mark Completed.", "The next service date updates automatically for recurring service."]],
  ["How to reschedule a service", ["Open Service Schedule.", "Click Reschedule.", "Choose the new date.", "Click Save date."]],
  ["How to check notifications", ["Click the bell icon.", "Open the related record.", "Mark notifications as read when handled."]],
  ["How to update labor and parts prices", ["Open Labor Items or Parts Items.", "Edit the item.", "Save the new price."]],
  ["How to edit service templates", ["Open Service Templates.", "Select a template.", "Add, remove, or adjust default items."]],
  ["Common mistakes", ["Check the selected customer before saving.", "Review quantity, unit price, and discount if totals look wrong.", "Select a template manually if one does not auto-load."]]
];

export function HelpPage() {
  return (
    <section>
      <AdminPageHeader title="Help / User Guide" description="Simple steps for daily office staff workflows." />
      <div className="grid gap-4 lg:grid-cols-2">
        {guideSections.map(([title, steps]) => (
          <section key={title as string} className="admin-panel p-5">
            <h2 className="font-bold text-ink">{title}</h2>
            <ol className="mt-3 grid list-decimal gap-2 pl-5 text-sm leading-6 text-muted">
              {(steps as string[]).map((step) => <li key={step}>{step}</li>)}
            </ol>
          </section>
        ))}
      </div>
    </section>
  );
}
