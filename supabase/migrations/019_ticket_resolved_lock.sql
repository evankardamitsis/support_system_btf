-- Resolved / closed tickets are read-only for staff updates (server actions + RLS)
drop policy if exists "tickets_update_staff" on public.tickets;

create policy "tickets_update_staff" on public.tickets
  for update using (
    public.get_my_role() in ('admin', 'agent')
    and status not in ('resolved', 'closed')
  );
