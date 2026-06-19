"use client";

import { Bell, Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/database.types";
import { getSafeErrorMessage } from "@/lib/security";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import { badgesForInquiry, getScheduleWindow, sortNotificationsForOps } from "@/lib/service-workflow";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];
type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];
type Inquiry = Database["public"]["Tables"]["inquiries"]["Row"];
type Quotation = Database["public"]["Tables"]["quotations"]["Row"];
type Schedule = Database["public"]["Tables"]["service_schedules"]["Row"];

function notificationKey(notification: Pick<Notification, "type" | "related_inquiry_id" | "related_quotation_id" | "related_schedule_id" | "message">) {
  return [notification.type, notification.related_inquiry_id ?? "", notification.related_quotation_id ?? "", notification.related_schedule_id ?? ""].join("|");
}

function notificationHref(notification: Notification) {
  if (notification.related_schedule_id) return `/admin/service-desk?tab=schedule&focus=${notification.related_schedule_id}`;
  if (notification.related_customer_id) return `/admin/customers/${notification.related_customer_id}`;
  if (notification.related_inquiry_id) return `/admin/service-desk?tab=inquiries&focus=${notification.related_inquiry_id}`;
  if (notification.related_quotation_id) return "/admin/quotations";
  return "/admin";
}

function formatScheduleTime(value: string | null | undefined) {
  if (!value) return "time not set";
  const [hours = "0", minutes = "0"] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date);
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const [notificationResult, inquiryResult, quoteResult, scheduleResult] = await Promise.all([
      supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("inquiries").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("quotations").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("service_schedules").select("*").order("next_service_date", { ascending: true }).limit(100)
    ]);

    if (notificationResult.error) {
      setError(getSafeErrorMessage("load notifications"));
      return;
    }

    const existing = (notificationResult.data ?? []) as Notification[];
    const inquiries = (inquiryResult.data ?? []) as Inquiry[];
    const quotations = (quoteResult.data ?? []) as Quotation[];
    const schedules = (scheduleResult.data ?? []) as Schedule[];
    const seen = new Set(existing.map(notificationKey));
    const candidates: NotificationInsert[] = [];

    inquiries
      .filter((inquiry) => !inquiry.created_by && inquiry.status === "New")
      .forEach((inquiry) => {
        const badges = badgesForInquiry(inquiry, inquiries, quotations, schedules);
        candidates.push({
          type: badges.includes("NEW CUSTOMER") ? "new_customer_inquiry" : "new_website_inquiry",
          title: badges.includes("NEW CUSTOMER") ? "New Customer Inquiry" : "New Website Inquiry",
          message: `${inquiry.customer_name} requested ${inquiry.service_type}.`,
          related_customer_id: inquiry.customer_id,
          related_inquiry_id: inquiry.id
        });
      });

    schedules
      .filter((schedule) => schedule.status === "active")
      .forEach((schedule) => {
        const window = getScheduleWindow(schedule);
        if (window === "today" || window === "upcoming") {
          candidates.push({
            type: "monthly_service_due_soon",
            title: "Monthly Service Due Soon",
            message: `${schedule.service_type} is due on ${formatDate(schedule.next_service_date)} at ${formatScheduleTime(schedule.scheduled_time)}.`,
            related_customer_id: schedule.customer_id,
            related_inquiry_id: schedule.inquiry_id,
            related_quotation_id: schedule.quotation_id,
            related_schedule_id: schedule.id
          });
        }
        if (window === "overdue") {
          candidates.push({
            type: "overdue_service",
            title: "Overdue Service",
            message: `${schedule.service_type} was due on ${formatDate(schedule.next_service_date)} at ${formatScheduleTime(schedule.scheduled_time)}.`,
            related_customer_id: schedule.customer_id,
            related_inquiry_id: schedule.inquiry_id,
            related_quotation_id: schedule.quotation_id,
            related_schedule_id: schedule.id
          });
        }
      });

    quotations.forEach((quote) => {
      if (quote.status === "Approved") {
        candidates.push({
          type: "quotation_approved",
          title: "Quotation Approved",
          message: `${quote.quotation_number} for ${quote.customer_name} is approved.`,
          related_customer_id: quote.customer_id,
          related_inquiry_id: quote.inquiry_id,
          related_quotation_id: quote.id
        });
      }
      const ageDays = Math.floor((Date.now() - new Date(quote.created_at).getTime()) / 86400000);
      if (quote.status === "Sent" && ageDays >= 7) {
        candidates.push({
          type: "quotation_needs_follow_up",
          title: "Quotation Needs Follow-up",
          message: `${quote.quotation_number} has been sent for ${ageDays} days.`,
          related_customer_id: quote.customer_id,
          related_inquiry_id: quote.inquiry_id,
          related_quotation_id: quote.id
        });
      }
    });

    const candidateSeen = new Set<string>();
    const newNotifications = candidates.filter((candidate) => {
      const key = notificationKey({
        type: candidate.type,
        related_inquiry_id: candidate.related_inquiry_id ?? null,
        related_quotation_id: candidate.related_quotation_id ?? null,
        related_schedule_id: candidate.related_schedule_id ?? null,
        message: candidate.message
      });
      if (seen.has(key) || candidateSeen.has(key)) return false;
      candidateSeen.add(key);
      return true;
    });

    if (newNotifications.length) {
      const { error: insertError } = await (supabase as any).from("notifications").insert(newNotifications);
      if (insertError) setError(getSafeErrorMessage("create notifications"));
    }

    const { data: refreshed } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20);
    setNotifications(sortNotificationsForOps((refreshed ?? existing) as Notification[]).slice(0, 20));
  }

  useEffect(() => {
    load();
  }, []);

  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.is_read).length, [notifications]);

  async function markAsRead(id: string) {
    const supabase = createClient();
    const { error: updateError } = await (supabase as any).from("notifications").update({ is_read: true }).eq("id", id);
    if (updateError) setError(getSafeErrorMessage("mark the notification as read"));
    await load();
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((notification) => !notification.is_read).map((notification) => notification.id);
    if (!unreadIds.length) return;
    const supabase = createClient();
    const { error: updateError } = await (supabase as any).from("notifications").update({ is_read: true }).in("id", unreadIds);
    if (updateError) setError(getSafeErrorMessage("mark notifications as read"));
    await load();
  }

  return (
    <div className="relative">
      <button className="focus-ring relative grid h-11 w-11 place-items-center rounded-md text-muted hover:bg-slate-100 hover:text-ink" onClick={() => setOpen((current) => !current)} aria-label="Open notifications">
        <Bell className="h-5 w-5" />
        {unreadCount ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-extrabold text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="fixed left-4 right-4 top-16 z-50 max-h-[calc(100dvh-5rem)] overflow-hidden rounded-lg border border-line bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:max-h-none sm:w-[min(22rem,calc(100vw-2rem))]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <h2 className="font-bold text-ink">Notifications</h2>
              {error ? <p className="text-xs font-semibold text-danger">{error}</p> : null}
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={markAllAsRead} disabled={!unreadCount}>Mark all read</Button>
              <Button size="sm" variant="ghost" onClick={load}>Refresh</Button>
            </div>
          </div>
          <div className="max-h-[calc(100dvh-12rem)] divide-y divide-line overflow-y-auto sm:max-h-[28rem]">
            {sortNotificationsForOps(notifications).slice(0, 10).map((notification) => (
              <div key={notification.id} className={`grid gap-2 p-4 ${notification.is_read ? "bg-slate-50 text-muted" : "bg-primary-50/60"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-ink">{notification.title}</p>
                    <p className="mt-1 text-sm leading-5 text-muted">{notification.message}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">{formatDate(notification.created_at)}</p>
                  </div>
                  {!notification.is_read ? (
                    <button className="focus-ring rounded-md p-2.5 text-muted hover:text-primary-700" onClick={() => markAsRead(notification.id)} aria-label="Mark as read">
                      <Check className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <Link href={notificationHref(notification)} className="inline-flex min-h-11 w-fit items-center gap-1 text-xs font-bold text-primary-700" onClick={() => setOpen(false)}>
                  Open <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            ))}
            {!notifications.length ? <p className="p-4 text-sm text-muted">No notifications yet.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
