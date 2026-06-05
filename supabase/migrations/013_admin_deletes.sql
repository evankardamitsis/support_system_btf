-- Staff can delete comments (needed for ticket cascade under RLS)
create policy "comments_delete_staff" on public.ticket_comments
  for delete using (public.get_my_role() in ('admin', 'agent'));

-- Ticket delete: admin only; agents keep insert/update
drop policy if exists "tickets_write_staff" on public.tickets;

create policy "tickets_insert_staff" on public.tickets
  for insert with check (public.get_my_role() in ('admin', 'agent'));

create policy "tickets_update_staff" on public.tickets
  for update using (public.get_my_role() in ('admin', 'agent'));

create policy "tickets_delete_admin" on public.tickets
  for delete using (public.get_my_role() = 'admin');

-- Keep retainer hours_used accurate when hours_log rows are removed
create or replace function public.decrement_retainer_hours()
returns trigger language plpgsql as $$
begin
  update public.retainers
  set hours_used = greatest(0, hours_used - (old.minutes / 60.0))
  where id = old.retainer_id;
  return old;
end;
$$;

drop trigger if exists hours_log_decrement_retainer on public.hours_log;
create trigger hours_log_decrement_retainer
  after delete on public.hours_log
  for each row execute function public.decrement_retainer_hours();
