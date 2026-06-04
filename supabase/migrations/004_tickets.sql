create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  assigned_to uuid references auth.users(id),
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'waiting_on_client', 'resolved', 'closed')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'critical')),
  type text not null default 'task' check (type in ('bug', 'task', 'request', 'question')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  resolved_at timestamptz
);

-- Auto-update updated_at on row change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tickets_updated_at
  before update on public.tickets
  for each row execute function public.set_updated_at();

alter table public.tickets enable row level security;

-- Admins and agents see all
create policy "tickets_read_staff" on public.tickets
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role in ('admin', 'agent')
    )
  );

-- Clients see only their tickets
create policy "tickets_read_own" on public.tickets
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role = 'client'
      and u.client_id = tickets.client_id
    )
  );

-- Clients can create tickets for their own client_id
create policy "tickets_insert_client" on public.tickets
  for insert with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.client_id = tickets.client_id
    )
  );

-- Admins/agents can write all
create policy "tickets_write_staff" on public.tickets
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role in ('admin', 'agent')
    )
  );
