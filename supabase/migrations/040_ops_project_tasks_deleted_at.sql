alter table public.ops_project_tasks
  add column if not exists deleted_at timestamptz;

create index if not exists ops_project_tasks_active_idx
  on public.ops_project_tasks (project_id)
  where deleted_at is null;
