-- Optional client sign-off on completed work before resolve & log hours
alter table public.tickets
  add column if not exists completion_status text
    check (completion_status is null or completion_status in ('pending_approval', 'approved')),
  add column if not exists completion_submitted_at timestamptz,
  add column if not exists completion_approved_at timestamptz;

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
    completion_status = 'approved'
    and status = 'in_progress'
  );
