-- Ensure resolved tickets have a resolution timestamp for analytics
update public.tickets
set resolved_at = updated_at
where status in ('resolved', 'closed')
  and resolved_at is null;
