-- Fixed monthly retainer: flat fee, no hour limits or hour-based billing
alter table public.retainers
  add column if not exists hours_limited boolean not null default true;

alter table public.retainers drop constraint if exists retainers_package_name_check;

alter table public.retainers
  add constraint retainers_package_name_check
  check (package_name in ('care', 'grow', 'fixed'));

alter table public.retainers drop constraint if exists retainers_hours_model_check;

alter table public.retainers
  add constraint retainers_hours_model_check
  check (
    (hours_limited = true and package_name in ('care', 'grow') and hours_total > 0)
    or (hours_limited = false and package_name = 'fixed' and hours_total = 0)
  );

comment on column public.retainers.hours_limited is 'When false (fixed package), tickets resolve without hour logging and clients see no hour usage';
