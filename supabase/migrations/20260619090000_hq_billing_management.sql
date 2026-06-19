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

create table if not exists public.hq_billing_records (
  id uuid primary key default gen_random_uuid(),
  service_reference text not null,
  client_branch text not null,
  service_type text not null,
  service_date date not null,
  technician text,
  service_location text,
  po_number text,
  po_date date,
  po_amount numeric(12,2),
  po_attachment_url text,
  po_attachment_name text,
  po_attachment_type text,
  po_attachment_size bigint,
  gr_number text,
  gr_date date,
  gr_remarks text,
  billing_status text not null default 'For Billing' check (billing_status in ('For Billing', 'Billed', 'Backjob', 'Pending Payment', 'Paid')),
  amount numeric(12,2) not null default 0 check (amount >= 0),
  billing_submitted_date date,
  expected_payment_date date,
  actual_payment_date date,
  remarks text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists hq_billing_records_status_idx on public.hq_billing_records (billing_status, service_date);
create index if not exists hq_billing_records_client_idx on public.hq_billing_records (client_branch);
create index if not exists hq_billing_records_po_idx on public.hq_billing_records (po_number);
create index if not exists hq_billing_records_gr_idx on public.hq_billing_records (gr_number);

drop trigger if exists hq_billing_records_updated_at on public.hq_billing_records;
create trigger hq_billing_records_updated_at before update on public.hq_billing_records for each row execute function public.set_updated_at();

alter table public.hq_billing_records enable row level security;

grant all on public.hq_billing_records to authenticated;

drop policy if exists "Staff manage HQ billing records" on public.hq_billing_records;
create policy "Staff manage HQ billing records"
on public.hq_billing_records
for all
to authenticated
using (public.current_user_is_staff())
with check (public.current_user_is_staff());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hq-billing-po', 'hq-billing-po', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png'];

drop policy if exists "Staff can read HQ billing PO attachments" on storage.objects;
create policy "Staff can read HQ billing PO attachments"
on storage.objects for select
to authenticated
using (bucket_id = 'hq-billing-po' and public.current_user_is_staff());

drop policy if exists "Staff can upload HQ billing PO attachments" on storage.objects;
create policy "Staff can upload HQ billing PO attachments"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'hq-billing-po'
  and public.current_user_is_staff()
  and lower(name) ~ '^billing/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|jpeg|png)$'
);

drop policy if exists "Staff can update HQ billing PO attachments" on storage.objects;
create policy "Staff can update HQ billing PO attachments"
on storage.objects for update
to authenticated
using (bucket_id = 'hq-billing-po' and public.current_user_is_staff())
with check (bucket_id = 'hq-billing-po' and public.current_user_is_staff());

drop policy if exists "Staff can delete HQ billing PO attachments" on storage.objects;
create policy "Staff can delete HQ billing PO attachments"
on storage.objects for delete
to authenticated
using (bucket_id = 'hq-billing-po' and public.current_user_is_staff());
