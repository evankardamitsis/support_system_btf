-- Client must approve BTF estimate before work can be resolved
alter table public.tickets
  add column if not exists estimate_status text
    check (estimate_status is null or estimate_status in ('pending_approval', 'approved')),
  add column if not exists estimate_submitted_at timestamptz,
  add column if not exists estimate_approved_at timestamptz;

-- Clients can approve a pending estimate on their own tickets
create policy "tickets_approve_estimate_client" on public.tickets
  for update using (
    public.get_my_role() = 'client'
    and estimate_status = 'pending_approval'
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.client_id = tickets.client_id
    )
  )
  with check (
    estimate_status = 'approved'
    and status = 'in_progress'
  );
