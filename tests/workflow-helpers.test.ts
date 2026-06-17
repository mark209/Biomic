import test from "node:test";
import assert from "node:assert/strict";
import {
  badgesForCustomer,
  badgesForInquiry,
  catalogUsageForItem,
  findDuplicateCustomers,
  scheduleDatesFromServiceDate,
  sortInquiriesForOps,
  sortNotificationsForOps
} from "../lib/service-workflow.ts";

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

test("badgesForCustomer treats a first linked record as a new customer", () => {
  const customer = {
    id: "customer-1",
    name: "New Customer",
    contact_number: "09171234567",
    email: null,
    address: "Makati",
    notes: null,
    created_at: now,
    updated_at: now
  };
  const inquiry = {
    id: "inquiry-1",
    reference_number: "DAI-2026-0530-1000",
    customer_id: customer.id,
    customer_name: customer.name,
    contact_number: customer.contact_number,
    email: null,
    address: customer.address,
    service_type: "Aircon Cleaning",
    aircon_type: "Wall-mounted Split",
    brand_model: null,
    problem_description: "First service request",
    preferred_schedule: null,
    photo_path: null,
    status: "New",
    created_by: null,
    created_at: now,
    updated_at: now
  };

  assert.deepEqual(badgesForCustomer(customer, [inquiry], [], []), ["NEW CUSTOMER"]);
});

test("badgesForInquiry does not mark same-name different-contact inquiries as returning", () => {
  const previousInquiry = {
    id: "inquiry-1",
    reference_number: "DAI-2026-0530-1000",
    customer_id: null,
    customer_name: "Juan Dela Cruz",
    contact_number: "09170000000",
    email: null,
    address: "Makati",
    service_type: "Aircon Cleaning",
    aircon_type: "Wall-mounted Split",
    brand_model: null,
    problem_description: "Earlier unrelated request",
    preferred_schedule: null,
    photo_path: null,
    status: "Completed",
    created_by: null,
    created_at: now,
    updated_at: now
  };
  const newInquiry = {
    ...previousInquiry,
    id: "inquiry-2",
    reference_number: "DAI-2026-0530-1001",
    contact_number: "09990000000",
    address: "Pasig",
    problem_description: "New unrelated customer request"
  };

  assert.deepEqual(badgesForInquiry(newInquiry, [previousInquiry, newInquiry], [], []), ["NEW CUSTOMER"]);
});

test("scheduleDatesFromServiceDate uses one selected service date for new schedules", () => {
  assert.deepEqual(scheduleDatesFromServiceDate("none", "2026-06-17"), {
    start_date: "2026-06-17",
    next_service_date: "2026-06-17"
  });
  assert.deepEqual(scheduleDatesFromServiceDate("monthly", "2026-06-17"), {
    start_date: "2026-06-17",
    next_service_date: "2026-06-17"
  });
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
