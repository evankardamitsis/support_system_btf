-- Dashboard-only client access for Performance Retainers.

alter table public.users
  add column if not exists portal_access_scope text not null default 'full';

do $$
begin
  alter table public.users
    add constraint users_portal_access_scope_check
    check (portal_access_scope in ('full', 'performance'));
exception
  when duplicate_object then null;
end $$;

alter table public.client_invite_tokens
  add column if not exists access_scope text not null default 'full';

alter table public.client_invite_tokens
  add column if not exists performance_account_id uuid
  references public.performance_accounts(id) on delete cascade;

do $$
begin
  alter table public.client_invite_tokens
    add constraint client_invite_tokens_access_scope_check
    check (access_scope in ('full', 'performance'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.client_invite_tokens
    add constraint client_invite_tokens_performance_scope_check
    check (
      (access_scope = 'full' and performance_account_id is null)
      or
      (access_scope = 'performance' and performance_account_id is not null)
    );
exception
  when duplicate_object then null;
end $$;

create index if not exists client_invite_tokens_performance_account_idx
  on public.client_invite_tokens (performance_account_id)
  where performance_account_id is not null;

-- Keep dashboard-only viewers out of the support portal at the database layer,
-- not only in the Next.js navigation and route guards.
create or replace function public.has_full_portal_access()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select portal_access_scope = 'full' from public.users where id = auth.uid()),
    false
  );
$$;

drop policy if exists "clients_read_own" on public.clients;
create policy "clients_read_own" on public.clients
  for select using (
    public.has_full_portal_access()
    and id = public.get_my_client_id()
  );

drop policy if exists "retainers_read_own" on public.retainers;
create policy "retainers_read_own" on public.retainers
  for select using (
    public.has_full_portal_access()
    and client_id = public.get_my_client_id()
  );

drop policy if exists "tickets_read_own" on public.tickets;
create policy "tickets_read_own" on public.tickets
  for select using (
    public.has_full_portal_access()
    and client_id = public.get_my_client_id()
  );

drop policy if exists "tickets_insert_client" on public.tickets;
create policy "tickets_insert_client" on public.tickets
  for insert with check (
    public.has_full_portal_access()
    and public.get_my_role() = 'client'
    and client_id = public.get_my_client_id()
  );

drop policy if exists "tickets_approve_estimate_client" on public.tickets;
create policy "tickets_approve_estimate_client" on public.tickets
  for update using (
    public.has_full_portal_access()
    and public.get_my_role() = 'client'
    and client_id = public.get_my_client_id()
    and estimate_status = 'pending_approval'
  )
  with check (estimate_status = 'approved' and status = 'in_progress');

drop policy if exists "tickets_approve_work_client" on public.tickets;
create policy "tickets_approve_work_client" on public.tickets
  for update using (
    public.has_full_portal_access()
    and public.get_my_role() = 'client'
    and client_id = public.get_my_client_id()
    and completion_status = 'pending_approval'
  )
  with check (completion_status = 'approved' and status = 'in_progress');

drop policy if exists "tickets_dispute_work_client" on public.tickets;
create policy "tickets_dispute_work_client" on public.tickets
  for update using (
    public.has_full_portal_access()
    and public.get_my_role() = 'client'
    and client_id = public.get_my_client_id()
    and completion_status = 'pending_approval'
  )
  with check (
    completion_status is null
    and status = 'in_progress'
    and completion_disputed_at is not null
    and completion_dispute_note is not null
  );

drop policy if exists "comments_read_client" on public.ticket_comments;
create policy "comments_read_client" on public.ticket_comments
  for select using (
    public.has_full_portal_access()
    and is_internal = false
    and exists (
      select 1 from public.tickets t
      where t.id = ticket_comments.ticket_id
        and t.client_id = public.get_my_client_id()
    )
  );

drop policy if exists "comments_insert_client" on public.ticket_comments;
create policy "comments_insert_client" on public.ticket_comments
  for insert with check (
    public.has_full_portal_access()
    and is_internal = false
    and author_id = auth.uid()
    and exists (
      select 1 from public.tickets t
      where t.id = ticket_comments.ticket_id
        and t.client_id = public.get_my_client_id()
    )
  );

drop policy if exists "hours_log_read_client" on public.hours_log;
create policy "hours_log_read_client" on public.hours_log
  for select using (
    public.has_full_portal_access()
    and exists (
      select 1 from public.tickets t
      where t.id = hours_log.ticket_id
        and t.client_id = public.get_my_client_id()
    )
  );

drop policy if exists "ticket_extra_hours_read_client" on public.ticket_extra_hours;
create policy "ticket_extra_hours_read_client" on public.ticket_extra_hours
  for select using (
    public.has_full_portal_access()
    and exists (
      select 1 from public.tickets t
      where t.id = ticket_extra_hours.ticket_id
        and t.client_id = public.get_my_client_id()
    )
  );

drop policy if exists "ticket_extra_hours_approve_client" on public.ticket_extra_hours;
create policy "ticket_extra_hours_approve_client" on public.ticket_extra_hours
  for update using (
    public.has_full_portal_access()
    and public.get_my_role() = 'client'
    and status = 'pending_approval'
    and exists (
      select 1 from public.tickets t
      where t.id = ticket_extra_hours.ticket_id
        and t.client_id = public.get_my_client_id()
        and t.status in ('resolved', 'closed')
    )
  )
  with check (status = 'approved');

drop policy if exists "ticket_attachments_read_client" on public.ticket_attachments;
create policy "ticket_attachments_read_client" on public.ticket_attachments
  for select using (
    public.has_full_portal_access()
    and exists (
      select 1 from public.tickets t
      where t.id = ticket_attachments.ticket_id
        and t.client_id = public.get_my_client_id()
        and (
          ticket_attachments.comment_id is null
          or exists (
            select 1 from public.ticket_comments tc
            where tc.id = ticket_attachments.comment_id
              and tc.is_internal = false
          )
        )
    )
  );

drop policy if exists "ticket_attachments_insert_client" on public.ticket_attachments;
create policy "ticket_attachments_insert_client" on public.ticket_attachments
  for insert with check (
    public.has_full_portal_access()
    and uploaded_by = auth.uid()
    and exists (
      select 1 from public.tickets t
      where t.id = ticket_attachments.ticket_id
        and t.client_id = public.get_my_client_id()
    )
  );

drop policy if exists "deferred_hours_read_client" on public.deferred_hours;
create policy "deferred_hours_read_client" on public.deferred_hours
  for select using (
    public.has_full_portal_access()
    and client_id = public.get_my_client_id()
  );

drop policy if exists "client_team_invites_portal" on public.client_invite_tokens;
create policy "client_team_invites_portal" on public.client_invite_tokens
  for all using (
    public.has_full_portal_access()
    and client_id = public.get_my_client_id()
  )
  with check (
    public.has_full_portal_access()
    and client_id = public.get_my_client_id()
    and access_scope = 'full'
  );

drop policy if exists "users_read_client_teammates" on public.users;
create policy "users_read_client_teammates" on public.users
  for select using (
    public.has_full_portal_access()
    and public.get_my_role() = 'client'
    and client_id is not null
    and client_id = public.get_my_client_id()
    and portal_access_scope = 'full'
  );
