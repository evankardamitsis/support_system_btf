-- Remove QA / demo tickets and test-only clients from production.
-- Run in Supabase SQL Editor. Review SELECTs before DELETE.
--
-- Demo seed clients (supabase/demo-seed.sql) — only if those were ever imported:
--   Pappas & Associates, Thessaloniki Digital, Kosmos Interiors

-- Preview tickets to remove (adjust patterns as needed)
-- select t.id, t.title, c.name
-- from public.tickets t
-- join public.clients c on c.id = t.client_id
-- where c.name ilike 'test client'
--    or c.email = 'kardamitsis.e@belowthefold.gr'
--    or c.name = 'Asad'
--    or t.title ilike 'test%';

-- Preview test-only clients
-- select id, name, email from public.clients
-- where name ilike 'test client'
--    or email = 'kardamitsis.e@belowthefold.gr'
--    or name = 'Asad';

-- Delete test tickets (cascades comments, hours_log, extra_hours)
-- delete from public.tickets
-- where client_id in (
--   select id from public.clients
--   where name ilike 'test client'
--      or email = 'kardamitsis.e@belowthefold.gr'
--      or name = 'Asad'
-- );

-- Delete orphaned hosting rows blocking client removal, then test clients
-- delete from public.ops_hosting_contracts
-- where client_id in (
--   select id from public.clients where name = 'Asad'
-- );
--
-- delete from public.clients
-- where name ilike 'test client'
--    or email = 'kardamitsis.e@belowthefold.gr'
--    or name = 'Asad';
