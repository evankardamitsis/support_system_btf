-- Drop the recursive policies on users
drop policy if exists "users_read_all_staff" on public.users;
drop policy if exists "users_read_own" on public.users;

-- Create a security definer function to get the current user's role
-- This bypasses RLS so there's no recursion
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from public.users where id = auth.uid();
$$;

-- Re-create non-recursive policies
create policy "users_read_own" on public.users
  for select using (auth.uid() = id);

create policy "users_read_all_staff" on public.users
  for select using (public.get_my_role() in ('admin', 'agent'));

-- Fix the same recursion issue in other tables
drop policy if exists "clients_read_staff" on public.clients;
drop policy if exists "clients_write_admin" on public.clients;
drop policy if exists "retainers_read_staff" on public.retainers;
drop policy if exists "retainers_write_staff" on public.retainers;
drop policy if exists "tickets_read_staff" on public.tickets;
drop policy if exists "tickets_write_staff" on public.tickets;
drop policy if exists "comments_read_staff" on public.ticket_comments;
drop policy if exists "comments_insert_staff" on public.ticket_comments;
drop policy if exists "hours_log_all_staff" on public.hours_log;
drop policy if exists "invite_tokens_admin" on public.invite_tokens;

-- Re-create all staff/admin policies using get_my_role()
create policy "clients_read_staff" on public.clients
  for select using (public.get_my_role() in ('admin', 'agent'));

create policy "clients_write_admin" on public.clients
  for all using (public.get_my_role() = 'admin');

create policy "retainers_read_staff" on public.retainers
  for select using (public.get_my_role() in ('admin', 'agent'));

create policy "retainers_write_staff" on public.retainers
  for all using (public.get_my_role() in ('admin', 'agent'));

create policy "tickets_read_staff" on public.tickets
  for select using (public.get_my_role() in ('admin', 'agent'));

create policy "tickets_write_staff" on public.tickets
  for all using (public.get_my_role() in ('admin', 'agent'));

create policy "comments_read_staff" on public.ticket_comments
  for select using (public.get_my_role() in ('admin', 'agent'));

create policy "comments_insert_staff" on public.ticket_comments
  for insert with check (
    author_id = auth.uid()
    and public.get_my_role() in ('admin', 'agent')
  );

create policy "hours_log_all_staff" on public.hours_log
  for all using (public.get_my_role() in ('admin', 'agent'));

create policy "invite_tokens_admin" on public.invite_tokens
  for all using (public.get_my_role() = 'admin');
