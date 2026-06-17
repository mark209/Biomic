-- Security hardening: restrict public inquiry writes, anonymous uploads, and profile role updates.

revoke select on public.inquiries from anon;
grant insert on public.inquiries to anon;

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
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'id'
      and udt_name = 'uuid'
  ) then
    revoke update (id, role, created_at, updated_at) on public.profiles from authenticated;
    grant update (full_name) on public.profiles to authenticated;
    drop policy if exists "Staff can read profiles" on public.profiles;
    create policy "Staff can read profiles" on public.profiles
    for select
    to authenticated
    using (public.current_user_is_staff() or (select auth.uid()) = id);
  end if;
end;
$$;

drop policy if exists "Public can create inquiries" on public.inquiries;
create policy "Public can create inquiries" on public.inquiries
for insert
to anon
with check (
  status = 'New'
  and created_by is null
  and customer_id is null
  and reference_number ~ '^DAI-[0-9]{4}-[0-9]{4}-[0-9]{4}$'
  and (
    photo_path is null
    or photo_path ~ '^DAI-[0-9]{4}-[0-9]{4}-[0-9]{4}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  )
);

drop policy if exists "Public can upload inquiry photos" on storage.objects;
create policy "Public can upload inquiry photos"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'inquiry-photos'
  and lower(name) ~ '^dai-[0-9]{4}-[0-9]{4}-[0-9]{4}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
);

drop policy if exists "Staff manage customers" on public.customers;
create policy "Staff manage customers" on public.customers for all to authenticated using (public.current_user_is_staff()) with check (public.current_user_is_staff());

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
