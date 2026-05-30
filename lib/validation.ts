import { z } from "zod";
import { airconTypes, inquiryStatuses, quotationStatuses, recurrenceTypes, serviceScheduleStatuses, serviceTypes } from "./constants";

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Customer name is required"),
  contact_number: z.string().trim().min(7, "Contact number is required"),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().trim().min(5, "Address is required"),
  notes: z.string().trim().optional().or(z.literal(""))
});

export const inquirySchema = z.object({
  customer_name: z.string().trim().min(2, "Customer name is required"),
  contact_number: z.string().trim().min(7, "Contact number is required"),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().trim().min(5, "Address is required"),
  service_type: z.enum(serviceTypes),
  aircon_type: z.enum(airconTypes),
  brand_model: z.string().trim().optional().or(z.literal("")),
  problem_description: z.string().trim().min(8, "Please describe the issue"),
  preferred_schedule: z.string().optional().or(z.literal("")),
  status: z.enum(inquiryStatuses).optional()
});

export const catalogItemSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  description: z.string().trim().optional().or(z.literal("")),
  default_price: z.coerce.number().min(0, "Price cannot be negative"),
  is_active: z.boolean().default(true)
});

export const serviceTemplateSchema = z.object({
  name: z.string().trim().min(2, "Template name is required"),
  service_type_key: z.string().trim().optional().or(z.literal("")),
  display_name: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().optional().or(z.literal("")),
  is_active: z.boolean().default(true)
});

export const serviceScheduleSchema = z.object({
  customer_id: z.string().uuid("Select a customer"),
  inquiry_id: z.string().uuid().optional().nullable().or(z.literal("")),
  quotation_id: z.string().uuid().optional().nullable().or(z.literal("")),
  service_type: z.string().trim().min(2, "Service type is required"),
  recurrence_type: z.enum(recurrenceTypes),
  start_date: z.string().min(1, "Start date is required"),
  next_service_date: z.string().min(1, "Next service date is required"),
  status: z.enum(serviceScheduleStatuses).default("active"),
  assigned_technician: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal(""))
});

export const quotationSchema = z.object({
  customer_id: z.string().uuid().optional().nullable(),
  inquiry_id: z.string().uuid().optional().nullable(),
  customer_name: z.string().trim().min(2),
  contact_number: z.string().trim().min(7),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().min(5),
  status: z.enum(quotationStatuses),
  discount: z.coerce.number().min(0).default(0),
  notes: z.string().trim().optional().or(z.literal("")),
  terms: z.string().trim().optional().or(z.literal(""))
});
