import { z } from "zod";
import { airconTypes, inquiryStatuses, quotationStatuses, recurrenceTypes, serviceScheduleStatuses, serviceTypes } from "./constants";

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Customer name is required").max(120, "Customer name is too long"),
  contact_number: z.string().trim().min(7, "Contact number is required").max(40, "Contact number is too long"),
  email: z.string().trim().email("Enter a valid email").max(254, "Email is too long").optional().or(z.literal("")),
  address: z.string().trim().min(5, "Address is required").max(500, "Address is too long"),
  notes: z.string().trim().max(2000, "Notes are too long").optional().or(z.literal(""))
});

export const inquirySchema = z.object({
  customer_name: z.string().trim().min(2, "Customer name is required").max(120, "Customer name is too long"),
  contact_number: z.string().trim().min(7, "Contact number is required").max(40, "Contact number is too long"),
  email: z.string().trim().email("Enter a valid email").max(254, "Email is too long").optional().or(z.literal("")),
  address: z.string().trim().min(5, "Address is required").max(500, "Address is too long"),
  service_type: z.enum(serviceTypes),
  aircon_type: z.enum(airconTypes),
  brand_model: z.string().trim().max(120, "Brand/model is too long").optional().or(z.literal("")),
  problem_description: z.string().trim().min(8, "Please describe the issue").max(3000, "Problem description is too long"),
  preferred_schedule: z.string().optional().or(z.literal("")),
  status: z.enum(inquiryStatuses).optional()
});

export const catalogItemSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120, "Name is too long"),
  description: z.string().trim().max(1000, "Description is too long").optional().or(z.literal("")),
  default_price: z.coerce.number().min(0, "Price cannot be negative"),
  is_active: z.boolean().default(true)
});

export const serviceTemplateSchema = z.object({
  name: z.string().trim().min(2, "Template name is required").max(120, "Template name is too long"),
  service_type_key: z.string().trim().max(80, "Service type key is too long").optional().or(z.literal("")),
  display_name: z.string().trim().max(120, "Display name is too long").optional().or(z.literal("")),
  description: z.string().trim().max(1000, "Description is too long").optional().or(z.literal("")),
  is_active: z.boolean().default(true)
});

export const serviceScheduleSchema = z.object({
  customer_id: z.string().uuid("Select a customer"),
  inquiry_id: z.string().uuid().optional().nullable().or(z.literal("")),
  quotation_id: z.string().uuid().optional().nullable().or(z.literal("")),
  service_type: z.string().trim().min(2, "Service type is required").max(120, "Service type is too long"),
  recurrence_type: z.enum(recurrenceTypes),
  start_date: z.string().min(1, "Start date is required"),
  next_service_date: z.string().min(1, "Next service date is required"),
  scheduled_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid service time").optional().or(z.literal("")),
  status: z.enum(serviceScheduleStatuses).default("active"),
  assigned_technician: z.string().trim().max(120, "Technician name is too long").optional().or(z.literal("")),
  notes: z.string().trim().max(2000, "Notes are too long").optional().or(z.literal(""))
});

export const quotationSchema = z.object({
  customer_id: z.string().uuid().optional().nullable(),
  inquiry_id: z.string().uuid().optional().nullable(),
  customer_name: z.string().trim().min(2).max(120),
  contact_number: z.string().trim().min(7).max(40),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  address: z.string().trim().min(5).max(500),
  status: z.enum(quotationStatuses),
  discount: z.coerce.number().min(0).default(0),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  terms: z.string().trim().max(4000).optional().or(z.literal(""))
});
