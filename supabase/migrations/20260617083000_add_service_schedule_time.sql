alter table public.service_schedules
add column if not exists scheduled_time time;
