alter table public.clients
  add column if not exists approval_reminders_enabled boolean not null default true;

comment on column public.clients.approval_reminders_enabled is
  'When false, skip automated ticket approval reminder emails and auto on-hold for this client.';
