-- Hours that pushed a retainer over its monthly cap, deferred to bill against
-- the client's next period instead. No client approval needed (unlike
-- ticket_extra_hours) — staff choose to shift already-approved work forward.
-- Rows stay pending (applied_at is null) until the next retainer period is
-- created, at which point insertRetainerPeriod() drains them into hours_log.
create table public.deferred_hours (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  agent_id uuid not null references auth.users(id),
  source_retainer_id uuid not null references public.retainers(id) on delete restrict,
  minutes int not null check (minutes > 0),
  note text,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  hours_log_id uuid references public.hours_log(id) on delete set null
);

create index deferred_hours_client_pending_idx
  on public.deferred_hours(client_id)
  where applied_at is null;

alter table public.deferred_hours enable row level security;

create policy "deferred_hours_staff" on public.deferred_hours
  for all using (public.get_my_role() in ('admin', 'agent'));

create policy "deferred_hours_read_client" on public.deferred_hours
  for select using (
    exists (
      select 1 from public.tickets t
      join public.users u on u.id = auth.uid()
      where t.id = deferred_hours.ticket_id
        and u.role = 'client'
        and u.client_id = t.client_id
    )
  );
