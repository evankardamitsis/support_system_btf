-- Replace custom hosting period with fixed 3-month and 6-month options

update public.ops_hosting_contracts
set
  period_type = case
    when period_type <> 'custom' then period_type
    when (period_end - period_start) <= 35 then 'month'
    when (period_end - period_start) <= 100 then '3month'
    when (period_end - period_start) <= 200 then '6month'
    else 'year'
  end,
  custom_period = null
where period_type = 'custom';

alter table public.ops_hosting_contracts
  drop constraint if exists ops_hosting_contracts_custom_period;

alter table public.ops_hosting_contracts
  drop constraint if exists ops_hosting_contracts_period_type_check;

alter table public.ops_hosting_contracts
  add constraint ops_hosting_contracts_period_type_check
  check (period_type in ('month', '3month', '6month', 'year'));
