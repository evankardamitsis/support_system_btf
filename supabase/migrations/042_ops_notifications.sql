-- In-app OPS notifications for staff (task due, hosting renewals, offer accepted, etc.)

create table public.ops_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'task_assigned',
    'task_due',
    'task_overdue',
    'offer_accepted',
    'hosting_renewal',
    'project_completed'
  )),
  title text not null,
  body text,
  href text not null,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index ops_notifications_user_dedupe_idx
  on public.ops_notifications (user_id, dedupe_key)
  where dedupe_key is not null;

create index ops_notifications_user_created_idx
  on public.ops_notifications (user_id, created_at desc);

create index ops_notifications_user_unread_idx
  on public.ops_notifications (user_id)
  where read_at is null;

alter table public.ops_notifications enable row level security;

create policy "ops_notifications_read_own" on public.ops_notifications
  for select using (auth.uid() = user_id);

create policy "ops_notifications_update_own" on public.ops_notifications
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
