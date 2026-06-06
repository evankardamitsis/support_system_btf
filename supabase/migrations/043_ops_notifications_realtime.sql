-- Enable Supabase Realtime for per-user OPS notification subscriptions.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ops_notifications'
  ) then
    alter publication supabase_realtime add table public.ops_notifications;
  end if;
end $$;
