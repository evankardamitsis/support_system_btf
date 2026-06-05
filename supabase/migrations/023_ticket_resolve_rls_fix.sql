-- Staff must be able to transition tickets TO resolved/closed.
-- Without an explicit WITH CHECK, Postgres reuses USING on the new row and blocks resolve.
drop policy if exists "tickets_update_staff" on public.tickets;

create policy "tickets_update_staff" on public.tickets
  for update using (
    public.get_my_role() in ('admin', 'agent')
    and status not in ('resolved', 'closed')
  )
  with check (
    public.get_my_role() in ('admin', 'agent')
  );
