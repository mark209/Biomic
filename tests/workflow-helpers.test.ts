import test from "node:test";
import assert from "node:assert/strict";
import {
  catalogUsageForItem,
  findDuplicateCustomers,
  sortInquiriesForOps,
  sortNotificationsForOps
} from "../lib/service-workflow";

const now = "2026-05-30T05:00:00.000Z";

test("findDuplicateCustomers matches normalized phone numbers and email", () => {
  const duplicates = findDuplicateCustomers(
    [
      {
        id: "customer-1",
        name: "Existing Customer",
        contact_number: "+63 917 123 4567",
        email: "existing@example.com",
        address: "Makati",
        notes: null,
        created_at: now,
        updated_at: now
      },
      {
        id: "customer-2",
        name: "Other Customer",
        contact_number: "09180000000",
        email: "other@example.com",
        address: "Pasig",
        notes: null,
        created_at: now,
        updated_at: now
      }
    ],
    { contact_number: "0917-123-4567", email: "EXISTING@example.com" }
  );

  assert.deepEqual(duplicates.map((customer) => customer.id), ["customer-1"]);
});

test("sortInquiriesForOps puts new and under-review work before completed work", () => {
  const sorted = sortInquiriesForOps([
    { id: "completed", status: "Completed", created_at: "2026-05-30T01:00:00.000Z" },
    { id: "newer-completed", status: "Completed", created_at: "2026-05-30T04:00:00.000Z" },
    { id: "under-review", status: "Under Review", created_at: "2026-05-30T02:00:00.000Z" },
    { id: "new", status: "New", created_at: "2026-05-30T03:00:00.000Z" }
  ]);

  assert.deepEqual(sorted.map((inquiry) => inquiry.id), ["new", "under-review", "newer-completed", "completed"]);
});

test("catalogUsageForItem detects quotation and template references", () => {
  const usage = catalogUsageForItem(
    "labor",
    "labor-1",
    [{ labor_item_id: "labor-1", part_item_id: null }],
    [{ source_labor_item_id: "labor-1", source_part_item_id: null }]
  );

  assert.equal(usage.isUsed, true);
  assert.equal(usage.templateCount, 1);
  assert.equal(usage.quotationCount, 1);
});

test("sortNotificationsForOps puts unread urgent service reminders first", () => {
  const sorted = sortNotificationsForOps([
    { id: "read-newer", type: "new_website_inquiry", is_read: true, created_at: "2026-05-30T04:00:00.000Z" },
    { id: "unread-normal", type: "new_website_inquiry", is_read: false, created_at: "2026-05-30T03:00:00.000Z" },
    { id: "overdue", type: "overdue_service", is_read: false, created_at: "2026-05-30T02:00:00.000Z" }
  ]);

  assert.deepEqual(sorted.map((notification) => notification.id), ["overdue", "unread-normal", "read-newer"]);
});
