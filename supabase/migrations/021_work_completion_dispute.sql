-- Client can dispute completed work before sign-off
alter table public.tickets
  add column if not exists completion_dispute_note text,
  add column if not exists completion_disputed_at timestamptz;

drop policy if exists "tickets_approve_work_client" on public.tickets;

create policy "tickets_approve_work_client" on public.tickets
  for update using (
    public.get_my_role() = 'client'
    and completion_status = 'pending_approval'
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.client_id = tickets.client_id
    )
  )
  with check (
    (
      completion_status = 'approved'
      and status = 'in_progress'
    )
    or (
      completion_status is null
      and status = 'in_progress'
      and completion_disputed_at is not null
    )
  );
