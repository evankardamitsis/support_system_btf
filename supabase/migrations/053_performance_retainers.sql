-- Performance Retainers: encrypted provider connections + normalized daily metrics.

create table public.performance_accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients(id) on delete cascade,
  display_name text not null,
  currency text not null default 'EUR',
  timezone text not null default 'Europe/Athens',
  target_roas numeric(8, 2),
  target_cpa numeric(12, 2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.performance_connections (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.performance_accounts(id) on delete cascade,
  provider text not null check (provider in ('shopify', 'meta', 'google', 'klaviyo')),
  status text not null default 'disconnected' check (status in ('disconnected', 'connected', 'error')),
  label text,
  external_account_id text,
  credentials_encrypted text not null,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, provider)
);

create table public.performance_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.performance_accounts(id) on delete cascade,
  provider text not null check (provider in ('shopify', 'meta', 'google', 'klaviyo')),
  metric_date date not null,
  revenue numeric(14, 2) not null default 0,
  spend numeric(14, 2) not null default 0,
  orders numeric(12, 2) not null default 0,
  conversions numeric(12, 2) not null default 0,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  sessions bigint not null default 0,
  new_customers bigint not null default 0,
  currency text not null default 'EUR',
  raw_payload jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  unique (account_id, provider, metric_date)
);

create index performance_connections_account_idx
  on public.performance_connections (account_id);
create index performance_daily_metrics_account_date_idx
  on public.performance_daily_metrics (account_id, metric_date desc);

alter table public.performance_accounts enable row level security;
alter table public.performance_connections enable row level security;
alter table public.performance_daily_metrics enable row level security;

create policy "performance_accounts_read_staff" on public.performance_accounts
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('admin', 'agent')
    )
  );

create policy "performance_accounts_write_admin" on public.performance_accounts
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  ) with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

create policy "performance_connections_read_staff" on public.performance_connections
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('admin', 'agent')
    )
  );

create policy "performance_connections_write_admin" on public.performance_connections
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  ) with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

create policy "performance_metrics_read_staff" on public.performance_daily_metrics
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('admin', 'agent')
    )
  );

-- Writes use the server-only Supabase secret key from verified sync routes.

do $$
begin
  alter publication supabase_realtime add table public.performance_daily_metrics;
exception
  when duplicate_object then null;
end $$;

-- Sasha is the first example only when his existing client record is present.
insert into public.performance_accounts (client_id, display_name, currency, timezone)
select id, name, 'EUR', 'Europe/Athens'
from public.clients
where lower(name) = 'sasha elage'
on conflict (client_id) do nothing;

