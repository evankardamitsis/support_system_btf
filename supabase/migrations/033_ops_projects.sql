-- Ops project management (admin-only): projects, phases, tasks, subtasks

create table public.ops_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_id uuid references public.clients(id) on delete set null,
  is_internal boolean not null default false,
  financial_offer_id uuid unique references public.financial_offers(id) on delete set null,
  template_key text
    check (template_key is null or template_key in ('blank', 'e_shop', 'digital_ads', 'email_marketing')),
  status text not null default 'active'
    check (status in ('active', 'on_hold', 'completed', 'archived')),
  lead_id uuid references auth.users(id) on delete set null,
  description text,
  start_date date,
  target_date date,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint ops_projects_internal_no_client check (
    is_internal = false or client_id is null
  )
);

create index ops_projects_status_idx on public.ops_projects (status)
  where deleted_at is null;
create index ops_projects_client_idx on public.ops_projects (client_id)
  where deleted_at is null;

create table public.ops_project_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ops_projects(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'done')),
  created_at timestamptz not null default now()
);

create index ops_project_phases_project_idx on public.ops_project_phases (project_id, sort_order);

create table public.ops_project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ops_projects(id) on delete cascade,
  phase_id uuid references public.ops_project_phases(id) on delete set null,
  parent_id uuid references public.ops_project_tasks(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'backlog'
    check (status in ('backlog', 'in_progress', 'review', 'done')),
  assignee_id uuid references auth.users(id) on delete set null,
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high')),
  due_date date,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ops_project_tasks_project_idx on public.ops_project_tasks (project_id, sort_order);
create index ops_project_tasks_phase_idx on public.ops_project_tasks (phase_id);
create index ops_project_tasks_parent_idx on public.ops_project_tasks (parent_id);
create index ops_project_tasks_assignee_idx on public.ops_project_tasks (assignee_id)
  where status <> 'done';

alter table public.ops_projects enable row level security;
alter table public.ops_project_phases enable row level security;
alter table public.ops_project_tasks enable row level security;

create policy "ops_projects_admin" on public.ops_projects
  for all using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

create policy "ops_project_phases_admin" on public.ops_project_phases
  for all using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

create policy "ops_project_tasks_admin" on public.ops_project_tasks
  for all using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');
