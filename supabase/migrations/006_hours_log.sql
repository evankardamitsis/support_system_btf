create table public.hours_log (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  retainer_id uuid not null references public.retainers(id) on delete cascade,
  agent_id uuid not null references auth.users(id),
  minutes int not null check (minutes > 0),
  note text,
  logged_at timestamptz default now()
);

-- Trigger: update retainers.hours_used after each hours_log insert
create or replace function public.increment_retainer_hours()
returns trigger language plpgsql as $$
begin
  update public.retainers
  set hours_used = hours_used + (new.minutes / 60.0)
  where id = new.retainer_id;
  return new;
end;
$$;

create trigger hours_log_update_retainer
  after insert on public.hours_log
  for each row execute function public.increment_retainer_hours();

alter table public.hours_log enable row level security;

-- Admins/agents can insert and select all
create policy "hours_log_all_staff" on public.hours_log
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role in ('admin', 'agent')
    )
  );

-- Clients can select hours for their tickets
create policy "hours_log_read_client" on public.hours_log
  for select using (
    exists (
      select 1 from public.tickets t
      join public.users u on u.id = auth.uid()
      where t.id = hours_log.ticket_id
      and u.role = 'client'
      and u.client_id = t.client_id
    )
  );
