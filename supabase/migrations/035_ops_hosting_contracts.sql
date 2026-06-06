-- Ops hosting & maintenance contracts (staff): track renewals and notify clients

create table public.ops_hosting_contracts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_id uuid not null references public.clients(id) on delete restrict,
  period_type text not null default 'year'
    check (period_type in ('month', 'year', 'custom')),
  custom_period text,
  cost_amount numeric(10, 2) not null check (cost_amount >= 0),
  period_start date not null,
  period_end date not null,
  status text not null default 'active'
    check (status in ('active', 'expired', 'canceled')),
  renewal_notified_at timestamptz,
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ops_hosting_contracts_period_order check (period_end >= period_start),
  constraint ops_hosting_contracts_custom_period check (
    period_type <> 'custom' or (custom_period is not null and length(trim(custom_period)) > 0)
  )
);

create index ops_hosting_contracts_client_idx on public.ops_hosting_contracts (client_id);
create index ops_hosting_contracts_status_idx on public.ops_hosting_contracts (status);
create index ops_hosting_contracts_period_end_idx on public.ops_hosting_contracts (period_end)
  where status = 'active';

alter table public.ops_hosting_contracts enable row level security;

create policy "ops_hosting_contracts_staff" on public.ops_hosting_contracts
  for all using (public.get_my_role() in ('admin', 'agent'))
  with check (public.get_my_role() in ('admin', 'agent'));
