-- Allow projects to sit in pending payment before completed/archived

alter table public.ops_projects drop constraint if exists ops_projects_status_check;

alter table public.ops_projects
  add constraint ops_projects_status_check
  check (status in ('active', 'on_hold', 'pending_payment', 'completed', 'archived'));
