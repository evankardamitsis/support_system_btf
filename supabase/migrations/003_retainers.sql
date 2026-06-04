create table public.retainers (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  hours_total numeric(6,2) not null,
  hours_used numeric(6,2) default 0,
  created_at timestamptz default now()
);

alter table public.retainers enable row level security;

-- Admins and agents see all
create policy "retainers_read_staff" on public.retainers
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role in ('admin', 'agent')
    )
  );

-- Clients see only their own retainers
create policy "retainers_read_own" on public.retainers
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role = 'client'
      and u.client_id = retainers.client_id
    )
  );

-- Only admins/agents can write
create policy "retainers_write_staff" on public.retainers
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role in ('admin', 'agent')
    )
  );
