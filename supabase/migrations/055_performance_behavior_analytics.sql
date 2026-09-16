-- Behavioral analytics for accurate page rankings and a session-based commerce funnel.

alter table public.performance_entity_metrics
  drop constraint if exists performance_entity_metrics_entity_type_check;

alter table public.performance_entity_metrics
  add constraint performance_entity_metrics_entity_type_check
  check (entity_type in (
    'ad',
    'product',
    'landing_page',
    'traffic_source',
    'marketing_channel',
    'klaviyo_campaign',
    'klaviyo_flow'
  ));

create table if not exists public.performance_web_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.performance_accounts(id) on delete cascade,
  event_id text not null,
  event_name text not null check (event_name in (
    'page_viewed',
    'product_viewed',
    'product_added_to_cart',
    'checkout_started',
    'checkout_completed'
  )),
  occurred_at timestamptz not null,
  visitor_key text not null,
  session_key text not null,
  page_url text,
  page_path text,
  page_title text,
  referrer_url text,
  product_id text,
  product_title text,
  order_id text,
  value numeric(14, 2),
  currency text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default now(),
  unique (account_id, event_id)
);

create index if not exists performance_web_events_account_date_idx
  on public.performance_web_events (account_id, occurred_at desc);

create index if not exists performance_web_events_page_idx
  on public.performance_web_events (account_id, page_path, occurred_at desc)
  where event_name = 'page_viewed';

create index if not exists performance_web_events_funnel_idx
  on public.performance_web_events (account_id, session_key, event_name, occurred_at desc);

alter table public.performance_web_events enable row level security;

drop policy if exists "Staff can read performance web events" on public.performance_web_events;
create policy "Staff can read performance web events"
  on public.performance_web_events for select
  to authenticated
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
        and users.role in ('admin', 'agent')
    )
  );

create or replace view public.performance_web_daily_rollup
with (security_invoker = true) as
select
  account_id,
  occurred_at::date as metric_date,
  count(*) filter (where event_name = 'page_viewed')::bigint as pageviews,
  count(distinct session_key) filter (where event_name = 'page_viewed')::bigint as sessions,
  count(distinct session_key) filter (where event_name = 'product_viewed')::bigint as product_view_sessions,
  count(distinct session_key) filter (where event_name = 'product_added_to_cart')::bigint as cart_sessions,
  count(distinct session_key) filter (where event_name = 'checkout_started')::bigint as checkout_sessions,
  count(distinct session_key) filter (where event_name = 'checkout_completed')::bigint as purchase_sessions
from public.performance_web_events
group by account_id, occurred_at::date;

create or replace view public.performance_page_rollup
with (security_invoker = true) as
select
  account_id,
  occurred_at::date as metric_date,
  coalesce(nullif(page_path, ''), '/') as page_path,
  max(nullif(page_title, '')) as page_title,
  count(*)::bigint as pageviews,
  count(distinct session_key)::bigint as sessions
from public.performance_web_events
where event_name = 'page_viewed'
group by account_id, occurred_at::date, coalesce(nullif(page_path, ''), '/');

create or replace view public.performance_utm_campaign_sales_rollup
with (security_invoker = true) as
with session_attribution as (
  select distinct on (account_id, session_key)
    account_id,
    session_key,
    utm_source,
    utm_medium,
    utm_campaign
  from public.performance_web_events
  where utm_campaign is not null
  order by account_id, session_key, occurred_at asc
)
select
  events.account_id,
  events.occurred_at::date as metric_date,
  attribution.utm_source,
  attribution.utm_medium,
  attribution.utm_campaign,
  count(*)::bigint as purchases,
  coalesce(sum(events.value), 0)::numeric(14, 2) as revenue
from public.performance_web_events events
join session_attribution attribution
  on attribution.account_id = events.account_id
 and attribution.session_key = events.session_key
where events.event_name = 'checkout_completed'
group by
  events.account_id,
  events.occurred_at::date,
  attribution.utm_source,
  attribution.utm_medium,
  attribution.utm_campaign;

grant select on public.performance_web_daily_rollup to authenticated;
grant select on public.performance_page_rollup to authenticated;
grant select on public.performance_utm_campaign_sales_rollup to authenticated;

comment on table public.performance_web_events is
  'Consent-gated Shopify Web Pixel events. Contains pseudonymous hashed identifiers and no direct customer PII.';
