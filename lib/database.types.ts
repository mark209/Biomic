export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: "admin" | "staff";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: "admin" | "staff";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string | null;
          role?: "admin" | "staff";
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          name: string;
          contact_number: string;
          email: string | null;
          address: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["customers"]["Row"]> & {
          name: string;
          contact_number: string;
          address: string;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Row"]>;
      };
      inquiries: {
        Row: {
          id: string;
          reference_number: string;
          customer_id: string | null;
          customer_name: string;
          contact_number: string;
          email: string | null;
          address: string;
          service_type: string;
          aircon_type: string;
          brand_model: string | null;
          problem_description: string;
          preferred_schedule: string | null;
          photo_path: string | null;
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["inquiries"]["Row"]> & {
          reference_number: string;
          customer_name: string;
          contact_number: string;
          address: string;
          service_type: string;
          aircon_type: string;
          problem_description: string;
        };
        Update: Partial<Database["public"]["Tables"]["inquiries"]["Row"]>;
      };
      labor_items: {
        Row: CatalogRow;
        Insert: CatalogInsert;
        Update: Partial<CatalogRow>;
      };
      parts_items: {
        Row: CatalogRow;
        Insert: CatalogInsert;
        Update: Partial<CatalogRow>;
      };
      service_templates: {
        Row: {
          id: string;
          name: string;
          service_type_key: string | null;
          display_name: string | null;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          service_type_key?: string | null;
          display_name?: string | null;
          description?: string | null;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["service_templates"]["Row"]>;
      };
      service_template_items: {
        Row: {
          id: string;
          service_template_id: string;
          item_type: "labor" | "part";
          labor_item_id: string | null;
          part_item_id: string | null;
          name_snapshot: string;
          description_snapshot: string | null;
          default_quantity: number;
          default_unit_price: number;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["service_template_items"]["Row"]> & {
          service_template_id: string;
          item_type: "labor" | "part";
          name_snapshot: string;
          default_quantity: number;
          default_unit_price: number;
        };
        Update: Partial<Database["public"]["Tables"]["service_template_items"]["Row"]>;
      };
      quotations: {
        Row: {
          id: string;
          quotation_number: string;
          inquiry_id: string | null;
          customer_id: string | null;
          customer_name: string;
          contact_number: string;
          email: string | null;
          address: string;
          status: string;
          subtotal: number;
          discount: number;
          grand_total: number;
          notes: string | null;
          terms: string | null;
          prepared_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["quotations"]["Row"]> & {
          quotation_number: string;
          customer_name: string;
          contact_number: string;
          address: string;
        };
        Update: Partial<Database["public"]["Tables"]["quotations"]["Row"]>;
      };
      quotation_items: {
        Row: {
          id: string;
          quotation_id: string;
          item_type: "labor" | "part" | "custom_labor" | "custom_part";
          source_labor_item_id: string | null;
          source_part_item_id: string | null;
          name_snapshot: string;
          description_snapshot: string | null;
          quantity: number;
          unit_price: number;
          line_total: number;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["quotation_items"]["Row"]> & {
          quotation_id: string;
          item_type: "labor" | "part" | "custom_labor" | "custom_part";
          name_snapshot: string;
          quantity: number;
          unit_price: number;
          line_total: number;
        };
        Update: Partial<Database["public"]["Tables"]["quotation_items"]["Row"]>;
      };
      service_schedules: {
        Row: {
          id: string;
          customer_id: string;
          inquiry_id: string | null;
          quotation_id: string | null;
          service_type: string;
          recurrence_type: "none" | "monthly" | "quarterly" | "semi_annual" | "annual";
          start_date: string;
          next_service_date: string;
          scheduled_time: string | null;
          last_service_date: string | null;
          status: "active" | "paused" | "completed" | "cancelled";
          assigned_technician: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["service_schedules"]["Row"]> & {
          customer_id: string;
          service_type: string;
          start_date: string;
          next_service_date: string;
          scheduled_time?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["service_schedules"]["Row"]>;
      };
      hq_billing_records: {
        Row: {
          id: string;
          service_reference: string;
          client_branch: string;
          service_type: string;
          service_date: string;
          technician: string | null;
          service_location: string | null;
          po_number: string | null;
          po_date: string | null;
          po_amount: number | null;
          po_attachment_url: string | null;
          po_attachment_name: string | null;
          po_attachment_type: string | null;
          po_attachment_size: number | null;
          gr_number: string | null;
          gr_date: string | null;
          gr_remarks: string | null;
          billing_status: "For Billing" | "Billed" | "Backjob" | "Pending Payment" | "Paid";
          amount: number;
          billing_submitted_date: string | null;
          expected_payment_date: string | null;
          actual_payment_date: string | null;
          remarks: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["hq_billing_records"]["Row"]> & {
          service_reference: string;
          client_branch: string;
          service_type: string;
          service_date: string;
          billing_status: "For Billing" | "Billed" | "Backjob" | "Pending Payment" | "Paid";
          amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["hq_billing_records"]["Row"]>;
      };
      notifications: {
        Row: {
          id: string;
          type:
            | "new_website_inquiry"
            | "new_customer_inquiry"
            | "monthly_service_due_soon"
            | "overdue_service"
            | "quotation_approved"
            | "quotation_needs_follow_up";
          title: string;
          message: string;
          related_customer_id: string | null;
          related_inquiry_id: string | null;
          related_quotation_id: string | null;
          related_schedule_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & {
          type: Database["public"]["Tables"]["notifications"]["Row"]["type"];
          title: string;
          message: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
      };
    };
  };
};

export type CatalogRow = {
  id: string;
  name: string;
  description: string | null;
  default_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CatalogInsert = {
  name: string;
  description?: string | null;
  default_price: number;
  is_active?: boolean;
};

export type TableName = keyof Database["public"]["Tables"];
