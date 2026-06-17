-- Daikin Authorized Service Center production MVP schema.
-- Run this file in the Supabase SQL editor before deploying the frontend.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_user_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'staff')
    or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'staff')
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('admin', 'staff')
    ),
    false
  );
$$;

grant execute on function public.current_user_is_staff() to authenticated;

do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  ) then
    create table public.profiles (
      id uuid primary key references auth.users(id) on delete cascade,
      full_name text,
      role text not null default 'staff' check (role in ('admin', 'staff')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  end if;
end;
$$;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_number text not null,
  email text,
  address text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  contact_number text not null,
  email text,
  address text not null,
  service_type text not null,
  aircon_type text not null,
  brand_model text,
  problem_description text not null,
  preferred_schedule date,
  photo_path text,
  status text not null default 'New' check (status in ('New', 'Under Review', 'Quoted', 'Approved', 'Scheduled', 'Completed', 'Cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.labor_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  default_price numeric(12,2) not null default 0 check (default_price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parts_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  default_price numeric(12,2) not null default 0 check (default_price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  service_type_key text,
  display_name text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.service_templates
add column if not exists service_type_key text,
add column if not exists display_name text;

create table if not exists public.service_template_items (
  id uuid primary key default gen_random_uuid(),
  service_template_id uuid not null references public.service_templates(id) on delete cascade,
  item_type text not null check (item_type in ('labor', 'part')),
  labor_item_id uuid references public.labor_items(id) on delete restrict,
  part_item_id uuid references public.parts_items(id) on delete restrict,
  name_snapshot text not null,
  description_snapshot text,
  default_quantity numeric(12,2) not null default 1 check (default_quantity > 0),
  default_unit_price numeric(12,2) not null default 0 check (default_unit_price >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.service_template_items
drop constraint if exists service_template_item_source;

alter table public.service_template_items
add constraint service_template_item_source
check (
  (item_type = 'labor' and labor_item_id is not null and part_item_id is null)
  or
  (item_type = 'part' and part_item_id is not null and labor_item_id is null)
);

create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  quotation_number text not null unique,
  inquiry_id uuid references public.inquiries(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  contact_number text not null,
  email text,
  address text not null,
  status text not null default 'Draft' check (status in ('Draft', 'Sent', 'Approved', 'Rejected', 'Completed')),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  grand_total numeric(12,2) not null default 0 check (grand_total >= 0),
  notes text,
  terms text,
  prepared_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  item_type text not null check (item_type in ('labor', 'part', 'custom_labor', 'custom_part')),
  source_labor_item_id uuid references public.labor_items(id) on delete set null,
  source_part_item_id uuid references public.parts_items(id) on delete set null,
  name_snapshot text not null,
  description_snapshot text,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  line_total numeric(12,2) not null default 0 check (line_total >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
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
  scheduled_time time,
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

create index if not exists customers_search_idx on public.customers using gin (to_tsvector('simple', name || ' ' || contact_number || ' ' || coalesce(email, '')));
create index if not exists inquiries_status_created_idx on public.inquiries (status, created_at desc);
create index if not exists quotations_status_created_idx on public.quotations (status, created_at desc);
create index if not exists quotation_items_quotation_idx on public.quotation_items (quotation_id, sort_order);
create index if not exists template_items_template_idx on public.service_template_items (service_template_id, sort_order);
create index if not exists service_templates_service_type_key_idx on public.service_templates (service_type_key);
create index if not exists service_schedules_customer_idx on public.service_schedules (customer_id, next_service_date);
create index if not exists service_schedules_due_idx on public.service_schedules (status, next_service_date);
create index if not exists notifications_unread_created_idx on public.notifications (is_read, created_at desc);
create index if not exists notifications_related_schedule_idx on public.notifications (related_schedule_id);
create unique index if not exists notifications_unique_inquiry_type_idx on public.notifications (type, related_inquiry_id) where related_inquiry_id is not null;
create unique index if not exists notifications_unique_quotation_type_idx on public.notifications (type, related_quotation_id) where related_quotation_id is not null;
create unique index if not exists notifications_unique_schedule_message_idx on public.notifications (type, related_schedule_id, message) where related_schedule_id is not null;

grant usage on schema public to anon, authenticated;
grant insert on public.inquiries to anon;
grant all on public.customers to authenticated;
grant all on public.inquiries to authenticated;
grant all on public.labor_items to authenticated;
grant all on public.parts_items to authenticated;
grant all on public.service_templates to authenticated;
grant all on public.service_template_items to authenticated;
grant all on public.quotations to authenticated;
grant all on public.quotation_items to authenticated;
grant all on public.service_schedules to authenticated;
grant all on public.notifications to authenticated;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'id'
      and udt_name = 'uuid'
  ) then
    drop trigger if exists profiles_updated_at on public.profiles;
    create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
  end if;
end;
$$;

drop trigger if exists customers_updated_at on public.customers;
create trigger customers_updated_at before update on public.customers for each row execute function public.set_updated_at();

drop trigger if exists inquiries_updated_at on public.inquiries;
create trigger inquiries_updated_at before update on public.inquiries for each row execute function public.set_updated_at();

drop trigger if exists labor_items_updated_at on public.labor_items;
create trigger labor_items_updated_at before update on public.labor_items for each row execute function public.set_updated_at();

drop trigger if exists parts_items_updated_at on public.parts_items;
create trigger parts_items_updated_at before update on public.parts_items for each row execute function public.set_updated_at();

drop trigger if exists service_templates_updated_at on public.service_templates;
create trigger service_templates_updated_at before update on public.service_templates for each row execute function public.set_updated_at();

drop trigger if exists quotations_updated_at on public.quotations;
create trigger quotations_updated_at before update on public.quotations for each row execute function public.set_updated_at();

drop trigger if exists service_schedules_updated_at on public.service_schedules;
create trigger service_schedules_updated_at before update on public.service_schedules for each row execute function public.set_updated_at();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'id'
      and udt_name = 'uuid'
  ) then
    alter table public.profiles enable row level security;
  end if;
end;
$$;

alter table public.customers enable row level security;
alter table public.inquiries enable row level security;
alter table public.labor_items enable row level security;
alter table public.parts_items enable row level security;
alter table public.service_templates enable row level security;
alter table public.service_template_items enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;
alter table public.service_schedules enable row level security;
alter table public.notifications enable row level security;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'id'
      and udt_name = 'uuid'
  ) then
    grant all on public.profiles to authenticated;
    revoke update (id, role, created_at, updated_at) on public.profiles from authenticated;
    grant update (full_name) on public.profiles to authenticated;
    drop policy if exists "Staff can read profiles" on public.profiles;
    create policy "Staff can read profiles" on public.profiles for select to authenticated using (public.current_user_is_staff() or (select auth.uid()) = id);
    drop policy if exists "Staff can update own profile" on public.profiles;
    create policy "Staff can update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
  end if;
end;
$$;

drop policy if exists "Staff manage customers" on public.customers;
create policy "Staff manage customers" on public.customers for all to authenticated using (public.current_user_is_staff()) with check (public.current_user_is_staff());

drop policy if exists "Public can create inquiries" on public.inquiries;
create policy "Public can create inquiries" on public.inquiries for insert to anon with check (
  status = 'New'
  and created_by is null
  and customer_id is null
  and reference_number ~ '^DAI-[0-9]{4}-[0-9]{4}-[0-9]{4}$'
  and (
    photo_path is null
    or photo_path ~ '^DAI-[0-9]{4}-[0-9]{4}-[0-9]{4}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  )
);

drop policy if exists "Staff manage inquiries" on public.inquiries;
create policy "Staff manage inquiries" on public.inquiries for all to authenticated using (public.current_user_is_staff()) with check (public.current_user_is_staff());

drop policy if exists "Staff manage labor items" on public.labor_items;
create policy "Staff manage labor items" on public.labor_items for all to authenticated using (public.current_user_is_staff()) with check (public.current_user_is_staff());

drop policy if exists "Staff manage parts items" on public.parts_items;
create policy "Staff manage parts items" on public.parts_items for all to authenticated using (public.current_user_is_staff()) with check (public.current_user_is_staff());

drop policy if exists "Staff manage service templates" on public.service_templates;
create policy "Staff manage service templates" on public.service_templates for all to authenticated using (public.current_user_is_staff()) with check (public.current_user_is_staff());

drop policy if exists "Staff manage service template items" on public.service_template_items;
create policy "Staff manage service template items" on public.service_template_items for all to authenticated using (public.current_user_is_staff()) with check (public.current_user_is_staff());

drop policy if exists "Staff manage quotations" on public.quotations;
create policy "Staff manage quotations" on public.quotations for all to authenticated using (public.current_user_is_staff()) with check (public.current_user_is_staff());

drop policy if exists "Staff manage quotation items" on public.quotation_items;
create policy "Staff manage quotation items" on public.quotation_items for all to authenticated using (public.current_user_is_staff()) with check (public.current_user_is_staff());

drop policy if exists "Staff manage service schedules" on public.service_schedules;
create policy "Staff manage service schedules" on public.service_schedules for all to authenticated using (public.current_user_is_staff()) with check (public.current_user_is_staff());

drop policy if exists "Staff manage notifications" on public.notifications;
create policy "Staff manage notifications" on public.notifications for all to authenticated using (public.current_user_is_staff()) with check (public.current_user_is_staff());

insert into public.labor_items (name, description, default_price)
select seed.name, seed.description, seed.default_price
from (
  values
    ('Aircon Cleaning Labor', 'Standard cleaning service labor charge.', 850::numeric),
    ('Chemical Cleaning', 'Deep chemical wash for indoor unit.', 1800::numeric),
    ('Diagnosis Fee', 'Troubleshooting and technical assessment.', 650::numeric),
    ('Installation Labor', 'Installation labor for standard split-type aircon.', 3500::numeric),
    ('Transportation Fee', 'Dispatch and transportation charge.', 500::numeric)
) as seed(name, description, default_price)
where not exists (
  select 1 from public.labor_items existing where existing.name = seed.name
);

insert into public.parts_items (name, description, default_price)
select seed.name, seed.description, seed.default_price
from (
  values
    ('Capacitor', 'Replacement capacitor.', 750::numeric),
    ('Fan Motor', 'Indoor or outdoor fan motor replacement.', 4200::numeric),
    ('PCB Board', 'Control board replacement.', 8500::numeric),
    ('Sensor', 'Temperature sensor replacement.', 1200::numeric),
    ('Compressor', 'Compressor replacement part.', 18500::numeric)
) as seed(name, description, default_price)
where not exists (
  select 1 from public.parts_items existing where existing.name = seed.name
);

insert into public.service_templates (name, service_type_key, display_name, description)
select seed.name, seed.service_type_key, seed.display_name, seed.description
from (
  values
    ('Aircon Cleaning Template', 'aircon_cleaning', 'Aircon Cleaning', 'Default quote load for standard cleaning.'),
    ('Diagnostics and Repair Template', 'diagnostics_and_repair', 'Diagnostics & Repair', 'Default quote load for repair assessment.'),
    ('Repair Template', 'diagnostics_and_repair', 'Repair', 'Default quote load for repair requests.'),
    ('Installation Template', 'installation', 'Installation', 'Default quote load for new installation.'),
    ('Chemical Cleaning Template', 'chemical_cleaning', 'Chemical Cleaning', 'Default quote load for deep chemical cleaning.'),
    ('Preventive Maintenance Template', 'annual_maintenance_contract', 'Preventive Maintenance', 'Default quote load for recurring office maintenance.'),
    ('Annual Maintenance Template', 'annual_maintenance_contract', 'Annual Maintenance Contract', 'Default quote load for recurring maintenance.')
) as seed(name, service_type_key, display_name, description)
where not exists (
  select 1 from public.service_templates existing where existing.name = seed.name
);

update public.service_templates
set service_type_key = case
    when lower(name) like '%cleaning%' and lower(name) not like '%chemical%' then 'aircon_cleaning'
    when lower(name) like '%chemical%' then 'chemical_cleaning'
    when lower(name) like '%diagnostic%' or lower(name) like '%repair%' then 'diagnostics_and_repair'
    when lower(name) like '%install%' then 'installation'
    when lower(name) like '%maintenance%' then 'annual_maintenance_contract'
    else service_type_key
  end,
  display_name = coalesce(display_name, regexp_replace(name, '\s+Template$', '', 'i'))
where service_type_key is null or display_name is null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inquiry-photos', 'inquiry-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Public can upload inquiry photos" on storage.objects;
create policy "Public can upload inquiry photos"
on storage.objects for insert
to anon
with check (
  bucket_id = 'inquiry-photos'
  and lower(name) ~ '^dai-[0-9]{4}-[0-9]{4}-[0-9]{4}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
);

drop policy if exists "Staff can read inquiry photos" on storage.objects;
create policy "Staff can read inquiry photos"
on storage.objects for select
to authenticated
using (bucket_id = 'inquiry-photos');

drop policy if exists "Staff can manage inquiry photos" on storage.objects;
create policy "Staff can manage inquiry photos"
on storage.objects for all
to authenticated
using (bucket_id = 'inquiry-photos')
with check (bucket_id = 'inquiry-photos');
