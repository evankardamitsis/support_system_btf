-- Estimated (planning) and actual (logged) hours on tickets
alter table public.tickets
  add column if not exists estimated_hours numeric(6,2) check (estimated_hours is null or estimated_hours >= 0),
  add column if not exists actual_hours numeric(6,2) check (actual_hours is null or actual_hours >= 0);

-- Keep ticket.actual_hours in sync with hours_log totals
create or replace function public.sync_ticket_actual_hours()
returns trigger language plpgsql as $$
begin
  update public.tickets
  set actual_hours = (
    select coalesce(sum(minutes) / 60.0, 0)
    from public.hours_log
    where ticket_id = coalesce(new.ticket_id, old.ticket_id)
  )
  where id = coalesce(new.ticket_id, old.ticket_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists hours_log_sync_ticket_actual on public.hours_log;
create trigger hours_log_sync_ticket_actual
  after insert or update or delete on public.hours_log
  for each row execute function public.sync_ticket_actual_hours();
