create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  contact_name text,
  plan_name text,
  billing_cycle_day int default 1,
  renewal_date date,
  sla_response_hours int default 8,
  created_at timestamptz default now()
);

alter table public.clients enable row level security;

-- Admins and agents see all rows
create policy "clients_read_staff" on public.clients
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role in ('admin', 'agent')
    )
  );

-- Clients see only their own client row
create policy "clients_read_own" on public.clients
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role = 'client'
      and u.client_id = clients.id
    )
  );

-- Only admins can insert/update/delete clients
create policy "clients_write_admin" on public.clients
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role = 'admin'
    )
  );
