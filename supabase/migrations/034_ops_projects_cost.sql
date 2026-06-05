alter table public.ops_projects
  add column cost_amount numeric(12, 2)
    check (cost_amount is null or cost_amount >= 0);
