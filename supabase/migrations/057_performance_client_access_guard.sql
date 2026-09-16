-- Defense in depth for dashboard-only client accounts.
-- Restrictive policies are ANDed with existing permissive policies, so a
-- performance viewer cannot use the Supabase API to bypass Next.js guards.

create or replace function public.get_my_portal_access_scope()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select portal_access_scope from public.users where id = auth.uid();
$$;

create or replace function public.has_full_portal_access()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(public.get_my_portal_access_scope() = 'full', false);
$$;

drop policy if exists "performance_viewer_clients_guard" on public.clients;
create policy "performance_viewer_clients_guard" on public.clients
  as restrictive for all
  using (coalesce(public.get_my_role() <> 'client', true) or public.has_full_portal_access())
  with check (coalesce(public.get_my_role() <> 'client', true) or public.has_full_portal_access());

drop policy if exists "performance_viewer_retainers_guard" on public.retainers;
create policy "performance_viewer_retainers_guard" on public.retainers
  as restrictive for all
  using (coalesce(public.get_my_role() <> 'client', true) or public.has_full_portal_access())
  with check (coalesce(public.get_my_role() <> 'client', true) or public.has_full_portal_access());

drop policy if exists "performance_viewer_tickets_guard" on public.tickets;
create policy "performance_viewer_tickets_guard" on public.tickets
  as restrictive for all
  using (coalesce(public.get_my_role() <> 'client', true) or public.has_full_portal_access())
  with check (coalesce(public.get_my_role() <> 'client', true) or public.has_full_portal_access());

drop policy if exists "performance_viewer_comments_guard" on public.ticket_comments;
create policy "performance_viewer_comments_guard" on public.ticket_comments
  as restrictive for all
  using (coalesce(public.get_my_role() <> 'client', true) or public.has_full_portal_access())
  with check (coalesce(public.get_my_role() <> 'client', true) or public.has_full_portal_access());

drop policy if exists "performance_viewer_hours_guard" on public.hours_log;
create policy "performance_viewer_hours_guard" on public.hours_log
  as restrictive for all
  using (coalesce(public.get_my_role() <> 'client', true) or public.has_full_portal_access())
  with check (coalesce(public.get_my_role() <> 'client', true) or public.has_full_portal_access());

drop policy if exists "performance_viewer_extra_hours_guard" on public.ticket_extra_hours;
create policy "performance_viewer_extra_hours_guard" on public.ticket_extra_hours
  as restrictive for all
  using (coalesce(public.get_my_role() <> 'client', true) or public.has_full_portal_access())
  with check (coalesce(public.get_my_role() <> 'client', true) or public.has_full_portal_access());

drop policy if exists "performance_viewer_attachments_guard" on public.ticket_attachments;
create policy "performance_viewer_attachments_guard" on public.ticket_attachments
  as restrictive for all
  using (coalesce(public.get_my_role() <> 'client', true) or public.has_full_portal_access())
  with check (coalesce(public.get_my_role() <> 'client', true) or public.has_full_portal_access());

drop policy if exists "performance_viewer_deferred_hours_guard" on public.deferred_hours;
create policy "performance_viewer_deferred_hours_guard" on public.deferred_hours
  as restrictive for all
  using (coalesce(public.get_my_role() <> 'client', true) or public.has_full_portal_access())
  with check (coalesce(public.get_my_role() <> 'client', true) or public.has_full_portal_access());

drop policy if exists "performance_viewer_team_invites_guard" on public.client_invite_tokens;
create policy "performance_viewer_team_invites_guard" on public.client_invite_tokens
  as restrictive for all
  using (coalesce(public.get_my_role() <> 'client', true) or public.has_full_portal_access())
  with check (coalesce(public.get_my_role() <> 'client', true) or public.has_full_portal_access());

drop policy if exists "performance_viewer_notifications_guard" on public.ops_notifications;
create policy "performance_viewer_notifications_guard" on public.ops_notifications
  as restrictive for all
  using (coalesce(public.get_my_role() <> 'client', true) or public.has_full_portal_access())
  with check (coalesce(public.get_my_role() <> 'client', true) or public.has_full_portal_access());

drop policy if exists "performance_viewer_users_guard" on public.users;
drop policy if exists "performance_viewer_users_select_guard" on public.users;
create policy "performance_viewer_users_select_guard" on public.users
  as restrictive for select
  using (
    public.get_my_role() in ('admin', 'agent')
    or public.has_full_portal_access()
    or id = auth.uid()
  );

drop policy if exists "performance_viewer_users_update_guard" on public.users;
create policy "performance_viewer_users_update_guard" on public.users
  as restrictive for update
  using (
    public.get_my_role() in ('admin', 'agent')
    or public.has_full_portal_access()
    or id = auth.uid()
  )
  with check (
    (public.get_my_role() in ('admin', 'agent') and id <> auth.uid())
    or (
      id = auth.uid()
      and role = public.get_my_role()
      and client_id is not distinct from public.get_my_client_id()
      and portal_access_scope = public.get_my_portal_access_scope()
    )
  );
