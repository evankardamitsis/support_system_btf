-- Retainer packages (Care / Grow) and internal contract value per period
alter table public.retainers
  add column if not exists package_name text not null default 'care'
    check (package_name in ('care', 'grow')),
  add column if not exists period_cost numeric(10, 2) not null default 0
    check (period_cost >= 0);

comment on column public.retainers.package_name is 'Product package: care or grow — hours/cost vary per client';
comment on column public.retainers.period_cost is 'Contract value for the period; admin-only, BTF internal metrics';
