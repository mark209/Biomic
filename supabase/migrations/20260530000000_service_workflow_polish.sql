-- Service workflow polish: recurring service schedules, reminders, and service-template matching.

alter table public.service_templates
add column if not exists service_type_key text,
add column if not exists display_name text;

update public.service_templates
set service_type_key = case
    when lower(name) like '%cleaning%' and lower(name) not like '%chemical%' then 'aircon_cleaning'
    when lower(name) like '%chemical%' then 'chemical_cleaning'
    when lower(name) like '%diagnostic%' or lower(name) like '%repair%' then 'diagnostics_and_repair'
    when lower(name) like '%install%' then 'installation'
    when lower(name) like '%maintenance%' then 'annual_maintenance_contract'
    else service_type_key
  end,
  display_name = coalesce(display_name, regexp_replace(name, '\\s+Template$', '', 'i'))
where service_type_key is null or display_name is null;

insert into public.service_templates (name, service_type_key, display_name, description, is_active)
select seed.name, seed.service_type_key, seed.display_name, seed.description, true
from (
  values
    ('Repair Template', 'diagnostics_and_repair', 'Repair', 'Default quote load for repair requests.'),
    ('Preventive Maintenance Template', 'annual_maintenance_contract', 'Preventive Maintenance', 'Default quote load for recurring office maintenance.')
) as seed(name, service_type_key, display_name, description)
where not exists (
  select 1 from public.service_templates existing where existing.name = seed.name
);

create table if not exists public.service_schedules (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  inquiry_id uuid references public.inquiries(id) on delete set null,
  quotation_id uuid references public.quotations(id) on delete set null,
  service_type text not null,
  recurrence_type text not null default 'none' check (recurrence_type in ('none', 'monthly', 'quarterly', 'semi_annual', 'annual')),
  start_date date not null,
  next_service_date date not null,
  last_service_date date,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'cancelled')),
  assigned_technician text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('new_website_inquiry', 'new_customer_inquiry', 'monthly_service_due_soon', 'overdue_service', 'quotation_approved', 'quotation_needs_follow_up')),
  title text not null,
  message text not null,
  related_customer_id uuid references public.customers(id) on delete cascade,
  related_inquiry_id uuid references public.inquiries(id) on delete cascade,
  related_quotation_id uuid references public.quotations(id) on delete cascade,
  related_schedule_id uuid references public.service_schedules(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists service_templates_service_type_key_idx on public.service_templates (service_type_key);
create index if not exists service_schedules_customer_idx on public.service_schedules (customer_id, next_service_date);
create index if not exists service_schedules_due_idx on public.service_schedules (status, next_service_date);
create index if not exists notifications_unread_created_idx on public.notifications (is_read, created_at desc);
create index if not exists notifications_related_schedule_idx on public.notifications (related_schedule_id);
create unique index if not exists notifications_unique_inquiry_type_idx
  on public.notifications (type, related_inquiry_id)
  where related_inquiry_id is not null;
create unique index if not exists notifications_unique_quotation_type_idx
  on public.notifications (type, related_quotation_id)
  where related_quotation_id is not null;
create unique index if not exists notifications_unique_schedule_message_idx
  on public.notifications (type, related_schedule_id, message)
  where related_schedule_id is not null;

grant all on public.service_schedules to authenticated;
grant all on public.notifications to authenticated;

alter table public.service_schedules enable row level security;
alter table public.notifications enable row level security;

drop trigger if exists service_schedules_updated_at on public.service_schedules;
create trigger service_schedules_updated_at before update on public.service_schedules for each row execute function public.set_updated_at();

drop policy if exists "Staff manage service schedules" on public.service_schedules;
create policy "Staff manage service schedules" on public.service_schedules for all to authenticated using (true) with check (true);

drop policy if exists "Staff manage notifications" on public.notifications;
create policy "Staff manage notifications" on public.notifications for all to authenticated using (true) with check (true);
