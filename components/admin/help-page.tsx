"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminPageHeader } from "./admin-page-header";
import { cn } from "@/lib/utils";

type GuideCategory =
  | "Getting Started"
  | "Inquiries"
  | "Customers"
  | "Quotations"
  | "Service Schedule"
  | "Admin Setup"
  | "Notifications"
  | "Common Mistakes";

type GuideItem = {
  id: string;
  title: string;
  category: GuideCategory;
  steps: string[];
};

const guideItems: GuideItem[] = [
  { id: "login", title: "How to log in", category: "Getting Started", steps: ["Open the admin login page.", "Enter your email and password.", "Click Sign in."] },
  { id: "view-new-inquiries", title: "How to view new inquiries", category: "Inquiries", steps: ["Open Inquiries.", "Look for New status.", "Click Quote when ready to prepare a quotation."] },
  { id: "identify-new-customers", title: "How to identify new customers", category: "Customers", steps: ["Check the badges beside customer names.", "NEW CUSTOMER means no previous records.", "RETURNING CUSTOMER means the customer has history."] },
  { id: "manual-inquiry", title: "How to create a manual inquiry", category: "Inquiries", steps: ["Open Inquiries.", "Click Manual inquiry.", "Fill in the customer and service details.", "Click Save inquiry."] },
  { id: "inquiry-to-quotation", title: "How to convert an inquiry into a quotation", category: "Quotations", steps: ["Open Inquiries.", "Click Quote.", "Review the auto-filled customer and service details."] },
  { id: "quotation-builder", title: "How to use the quotation builder", category: "Quotations", steps: ["Check customer details.", "Review loaded labor and parts.", "Edit quantities or prices if needed.", "Click Save quotation."] },
  { id: "download-quotation-pdf", title: "How to download a quotation PDF", category: "Quotations", steps: ["Open Quotations.", "Find the quotation.", "Click PDF."] },
  { id: "manage-customers", title: "How to manage customers", category: "Customers", steps: ["Open Customers.", "Click View for the customer profile.", "Use Edit to update details."] },
  { id: "monthly-service-schedule", title: "How to create a monthly service schedule", category: "Service Schedule", steps: ["Open Service Schedule or a customer profile.", "Click New service schedule or Create Monthly Service.", "Choose Monthly recurrence.", "Save the schedule."] },
  { id: "mark-service-completed", title: "How to mark a service as completed", category: "Service Schedule", steps: ["Open Service Schedule.", "Click Mark Completed.", "The next service date updates automatically for recurring service."] },
  { id: "reschedule-service", title: "How to reschedule a service", category: "Service Schedule", steps: ["Open Service Schedule.", "Click Reschedule.", "Choose the new date.", "Click Save date."] },
  { id: "check-notifications", title: "How to check notifications", category: "Notifications", steps: ["Click the bell icon.", "Open the related record.", "Mark notifications as read when handled."] },
  { id: "update-prices", title: "How to update labor and parts prices", category: "Admin Setup", steps: ["Open Labor Items or Parts Items.", "Edit the item.", "Save the new price."] },
  { id: "edit-service-templates", title: "How to edit service templates", category: "Admin Setup", steps: ["Open Service Templates.", "Select a template.", "Add, remove, or adjust default items."] },
  { id: "common-mistakes", title: "Common mistakes", category: "Common Mistakes", steps: ["Check the selected customer before saving.", "Review quantity, unit price, and discount if totals look wrong.", "Select a template manually if one does not auto-load."] }
];

const quickStartIds = ["login", "view-new-inquiries", "inquiry-to-quotation", "download-quotation-pdf", "mark-service-completed"];

const categoryStyles: Record<GuideCategory, string> = {
  "Getting Started": "bg-primary-50 text-primary-800 ring-primary-100",
  Inquiries: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  Customers: "bg-orange-50 text-orange-800 ring-orange-100",
  Quotations: "bg-violet-50 text-violet-800 ring-violet-100",
  "Service Schedule": "bg-sky-50 text-sky-800 ring-sky-100",
  "Admin Setup": "bg-rose-50 text-rose-800 ring-rose-100",
  Notifications: "bg-amber-50 text-amber-800 ring-amber-100",
  "Common Mistakes": "bg-slate-100 text-slate-700 ring-slate-200"
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function HelpPage() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>("manual-inquiry");

  const filteredItems = useMemo(() => {
    const needle = normalize(query);

    return guideItems.filter((item) => {
      const haystack = normalize(`${item.title} ${item.category} ${item.steps.join(" ")}`);
      return !needle || haystack.includes(needle);
    });
  }, [query]);

  const quickStartItems = quickStartIds
    .map((id) => guideItems.find((item) => item.id === id))
    .filter((item): item is GuideItem => Boolean(item));

  return (
    <section className="mx-auto max-w-6xl">
      <AdminPageHeader title="Help / User Guide" description="Find answers and step-by-step guides for daily office workflows." />

      <div className="space-y-5">
        <div className="admin-panel p-4">
          <label className="relative block" aria-label="Search help topics">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search help topics, workflows, or modules..."
              className="focus-ring min-h-12 w-full rounded-md border-line bg-white pl-12 pr-11 text-sm"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="focus-ring absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-slate-100"
                aria-label="Clear help search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>

        </div>

        <section className="admin-panel p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-extrabold text-ink">Quick Start</h2>
            <span className="text-xs font-semibold text-muted">{filteredItems.length} guide{filteredItems.length === 1 ? "" : "s"}</span>
          </div>
          <div className="grid gap-2 md:grid-cols-5">
            {quickStartItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setQuery("");
                  setOpenId(item.id);
                }}
                className="focus-ring flex min-h-16 items-center justify-between gap-3 rounded-md border border-line bg-white px-3 py-3 text-left text-sm font-bold text-ink hover:border-primary-200 hover:bg-primary-50"
              >
                <span className="line-clamp-2">{item.title}</span>
                <ChevronDown className="h-4 w-4 shrink-0 -rotate-90 text-muted" />
              </button>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-base font-extrabold text-ink">Frequently Asked Questions</h2>
          </div>

          {filteredItems.length ? (
            <div className="divide-y divide-line">
              {filteredItems.map((item) => {
                const expanded = openId === item.id;
                return (
                  <article key={item.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(expanded ? null : item.id)}
                      aria-expanded={expanded}
                      className="focus-ring flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-slate-50"
                    >
                      <span className={cn("w-36 shrink-0 rounded-md px-3 py-1 text-xs font-extrabold ring-1", categoryStyles[item.category])}>{item.category}</span>
                      <span className="min-w-0 flex-1 text-sm font-extrabold text-ink md:text-base">{item.title}</span>
                      <ChevronDown className={cn("h-5 w-5 shrink-0 text-ink transition-transform", expanded ? "rotate-180" : "")} />
                    </button>
                    <div className={cn("grid transition-[grid-template-rows] duration-200 ease-out", expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                      <div className="overflow-hidden">
                        <ol className="border-t border-line bg-primary-50/35 px-8 py-4 text-sm leading-7 text-ink">
                          {item.steps.map((step, index) => (
                            <li key={step} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2">
                              <span className="font-extrabold text-primary-800">{index + 1}.</span>
                              <span className="break-words text-muted">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <p className="font-extrabold text-ink">No guide found.</p>
              <p className="mt-1 text-sm text-muted">Try another keyword.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
