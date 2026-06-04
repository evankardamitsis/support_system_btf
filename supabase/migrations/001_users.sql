create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  role text not null check (role in ('admin', 'agent', 'client')),
  client_id uuid,
  full_name text,
  created_at timestamptz default now()
);

alter table public.users enable row level security;

-- Users can read their own row
create policy "users_read_own" on public.users
  for select using (auth.uid() = id);

-- Admins and agents can read all rows
create policy "users_read_all_staff" on public.users
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role in ('admin', 'agent')
    )
  );

-- Allow insert on signup (via service role or trigger)
create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);

-- Allow users to update their own row
create policy "users_update_own" on public.users
  for update using (auth.uid() = id);
