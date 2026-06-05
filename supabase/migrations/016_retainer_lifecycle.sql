-- Retainer lifecycle: auto-renew runs while status is active; frozen/canceled stop renewal.
alter table public.clients
  add column if not exists retainer_status text not null default 'active'
    check (retainer_status in ('active', 'frozen', 'canceled')),
  add column if not exists retainer_frozen_at timestamptz,
  add column if not exists retainer_canceled_at timestamptz;

comment on column public.clients.retainer_status is
  'active = auto-renew on; frozen/canceled pause renewal and block client requests + hour logging';

update public.clients
set retainer_status = 'active'
where retainer_status is null;
