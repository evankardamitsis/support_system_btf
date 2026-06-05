-- Explicit staff policies for ticket_extra_hours (insert was failing under FOR ALL)
drop policy if exists "ticket_extra_hours_staff" on public.ticket_extra_hours;

create policy "ticket_extra_hours_staff_select" on public.ticket_extra_hours
  for select using (public.get_my_role() in ('admin', 'agent'));

create policy "ticket_extra_hours_staff_insert" on public.ticket_extra_hours
  for insert with check (public.get_my_role() in ('admin', 'agent'));

create policy "ticket_extra_hours_staff_update" on public.ticket_extra_hours
  for update using (public.get_my_role() in ('admin', 'agent'))
  with check (public.get_my_role() in ('admin', 'agent'));

create policy "ticket_extra_hours_staff_delete" on public.ticket_extra_hours
  for delete using (public.get_my_role() in ('admin', 'agent'));
