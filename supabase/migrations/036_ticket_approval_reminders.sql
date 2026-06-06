-- Client approval reminders: day 2, day 5, then on_hold on day 6+

alter table public.tickets drop constraint if exists tickets_status_check;

alter table public.tickets
  add constraint tickets_status_check
  check (status in ('open', 'in_progress', 'waiting_on_client', 'on_hold', 'resolved', 'closed'));

alter table public.tickets
  add column if not exists approval_reminder_count smallint not null default 0,
  add column if not exists approval_reminder_sent_at timestamptz,
  add column if not exists on_hold_at timestamptz;

alter table public.ticket_extra_hours
  add column if not exists reminder_count smallint not null default 0,
  add column if not exists reminder_sent_at timestamptz;
