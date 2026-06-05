-- Post-resolve extra hours: client approval before billing; does not change ticket.actual_hours
alter table public.hours_log
  add column if not exists is_extra boolean not null default false;

create table if not exists public.ticket_extra_hours (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  retainer_id uuid not null references public.retainers(id) on delete restrict,
  agent_id uuid not null references auth.users(id),
  minutes int not null check (minutes > 0),
  note text,
  status text not null default 'pending_approval'
    check (status in ('pending_approval', 'approved')),
  submitted_at timestamptz not null default now(),
  approved_at timestamptz,
  hours_log_id uuid references public.hours_log(id) on delete set null
);

create index if not exists ticket_extra_hours_ticket_id_idx
  on public.ticket_extra_hours(ticket_id);

-- Keep ticket.actual_hours = initial logged hours only (exclude is_extra rows)
create or replace function public.sync_ticket_actual_hours()
returns trigger language plpgsql as $$
begin
  update public.tickets
  set actual_hours = (
    select coalesce(sum(minutes) / 60.0, 0)
    from public.hours_log
    where ticket_id = coalesce(new.ticket_id, old.ticket_id)
      and is_extra = false
  )
  where id = coalesce(new.ticket_id, old.ticket_id);
  return coalesce(new, old);
end;
$$;

alter table public.ticket_extra_hours enable row level security;

create policy "ticket_extra_hours_staff" on public.ticket_extra_hours
  for all using (public.get_my_role() in ('admin', 'agent'));

create policy "ticket_extra_hours_read_client" on public.ticket_extra_hours
  for select using (
    exists (
      select 1 from public.tickets t
      join public.users u on u.id = auth.uid()
      where t.id = ticket_extra_hours.ticket_id
        and u.role = 'client'
        and u.client_id = t.client_id
    )
  );

create policy "ticket_extra_hours_approve_client" on public.ticket_extra_hours
  for update using (
    public.get_my_role() = 'client'
    and status = 'pending_approval'
    and exists (
      select 1 from public.tickets t
      join public.users u on u.id = auth.uid()
      where t.id = ticket_extra_hours.ticket_id
        and u.client_id = t.client_id
        and t.status in ('resolved', 'closed')
    )
  )
  with check (status = 'approved');
