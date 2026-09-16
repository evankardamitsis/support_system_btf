create table if not exists public.performance_entity_metrics (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.performance_accounts(id) on delete cascade,
  provider text not null check (provider in ('shopify', 'meta', 'google', 'klaviyo')),
  metric_date date not null,
  entity_type text not null check (entity_type in ('ad', 'product', 'landing_page', 'klaviyo_campaign', 'klaviyo_flow')),
  entity_id text not null,
  entity_name text not null,
  parent_id text,
  parent_name text,
  revenue numeric not null default 0,
  spend numeric not null default 0,
  orders numeric not null default 0,
  conversions numeric not null default 0,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  sessions bigint not null default 0,
  delivered bigint not null default 0,
  opens bigint not null default 0,
  unsubscribes bigint not null default 0,
  currency text not null default 'EUR',
  raw_payload jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  unique (account_id, provider, metric_date, entity_type, entity_id)
);

create index if not exists performance_entity_metrics_account_date_idx
  on public.performance_entity_metrics (account_id, metric_date desc);

create index if not exists performance_entity_metrics_leaderboard_idx
  on public.performance_entity_metrics (account_id, entity_type, revenue desc, spend desc);

alter table public.performance_entity_metrics enable row level security;

drop policy if exists "Staff can read performance entity metrics" on public.performance_entity_metrics;
create policy "Staff can read performance entity metrics"
  on public.performance_entity_metrics for select
  to authenticated
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
        and users.role in ('admin', 'agent')
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.performance_entity_metrics;
exception
  when duplicate_object then null;
end $$;
