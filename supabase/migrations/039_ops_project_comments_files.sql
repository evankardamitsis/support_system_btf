-- Task comments and project/task file attachments (admin ops)

create table public.ops_project_task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.ops_project_tasks(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null,
  created_at timestamptz not null default now()
);

create index ops_project_task_comments_task_idx
  on public.ops_project_task_comments (task_id, created_at);

create table public.ops_project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ops_projects(id) on delete cascade,
  task_id uuid references public.ops_project_tasks(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index ops_project_files_project_idx
  on public.ops_project_files (project_id, created_at desc);
create index ops_project_files_task_idx
  on public.ops_project_files (task_id)
  where task_id is not null;

alter table public.ops_project_task_comments enable row level security;
alter table public.ops_project_files enable row level security;

create policy "ops_project_task_comments_admin" on public.ops_project_task_comments
  for all using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

create policy "ops_project_files_admin" on public.ops_project_files
  for all using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

insert into storage.buckets (id, name, public, file_size_limit)
values ('ops-project-files', 'ops-project-files', false, 20971520)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

create policy "ops_project_files_storage_admin_select" on storage.objects
  for select using (
    bucket_id = 'ops-project-files'
    and public.get_my_role() = 'admin'
  );

create policy "ops_project_files_storage_admin_insert" on storage.objects
  for insert with check (
    bucket_id = 'ops-project-files'
    and public.get_my_role() = 'admin'
  );

create policy "ops_project_files_storage_admin_delete" on storage.objects
  for delete using (
    bucket_id = 'ops-project-files'
    and public.get_my_role() = 'admin'
  );
