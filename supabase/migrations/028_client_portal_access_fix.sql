-- Security-definer helpers for client portal RLS (avoids users-table subquery issues)
create or replace function public.get_my_client_id()
returns uuid
language sql
security definer
stable
as $$
  select client_id from public.users where id = auth.uid() and role = 'client';
$$;

drop policy if exists "tickets_insert_client" on public.tickets;

create policy "tickets_insert_client" on public.tickets
  for insert with check (
    public.get_my_role() = 'client'
    and public.get_my_client_id() is not null
    and client_id = public.get_my_client_id()
  );

drop policy if exists "users_read_client_teammates" on public.users;

create policy "users_read_client_teammates" on public.users
  for select using (
    public.get_my_role() = 'client'
    and client_id is not null
    and client_id = public.get_my_client_id()
  );
