-- Track when a resolved ticket was reopened for approved extra-hours work
alter table public.tickets
  add column if not exists extra_hours_active_at timestamptz;
