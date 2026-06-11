-- BTF Support — Demo Seed Data (local / staging only — do NOT run on production)
-- Optional fictional clients and tickets for UI demos.
-- Replace 'kardamitsis.e@gmail.com' if your admin email differs.
-- To remove QA data from a live project, see supabase/cleanup-test-data.sql

DO $$
DECLARE
  admin_id    uuid;
  c1_id       uuid := gen_random_uuid();
  c2_id       uuid := gen_random_uuid();
  c3_id       uuid := gen_random_uuid();
  r1_id       uuid := gen_random_uuid();
  r2_id       uuid := gen_random_uuid();
  r3_id       uuid := gen_random_uuid();
  t1_id       uuid := gen_random_uuid();
  t2_id       uuid := gen_random_uuid();
  t3_id       uuid := gen_random_uuid();
  t4_id       uuid := gen_random_uuid();
  t5_id       uuid := gen_random_uuid();
  t6_id       uuid := gen_random_uuid();
BEGIN
  SELECT id INTO admin_id FROM auth.users
  WHERE email = 'kardamitsis.e@gmail.com' LIMIT 1;

  -- Clients
  INSERT INTO public.clients (id, name, email, contact_name, plan_name, billing_cycle_day, sla_response_hours, renewal_date)
  VALUES
    (c1_id, 'Pappas & Associates', 'info@pappas-assoc.gr',  'Nikos Pappas',     'Grow', 1,  8, '2026-09-01'),
    (c2_id, 'Thessaloniki Digital', 'hello@thesdig.gr',      'Maria Antoniadou', 'Care', 15, 12, '2026-07-15'),
    (c3_id, 'Kosmos Interiors',    'studio@kosmos-int.gr',   'Eleni Stavros',    'Grow', 1,  6, '2026-06-30');

  -- Retainers (Care / Grow — hours and cost per client)
  INSERT INTO public.retainers (id, client_id, package_name, period_start, period_end, hours_total, hours_used, period_cost)
  VALUES
    (r1_id, c1_id, 'grow', '2026-05-01', '2026-07-31', 20, 14.5, 2400),
    (r2_id, c2_id, 'care', '2026-06-01', '2026-06-30', 12, 3.0,  960),
    (r3_id, c3_id, 'grow', '2026-04-01', '2026-06-30', 30, 28.5, 3600);

  -- Tickets
  INSERT INTO public.tickets (id, client_id, created_by, title, description, status, priority, type)
  VALUES
    (t1_id, c1_id, admin_id,
      'Homepage animation broken on Safari',
      'The hero animation plays correctly on Chrome and Firefox but freezes on Safari 17. Happens on desktop and mobile.',
      'open', 'high', 'bug'),

    (t2_id, c1_id, admin_id,
      'Add consulting service card to homepage',
      'Need a fourth card in the services section for the new consulting offering. Copy will be sent separately.',
      'in_progress', 'normal', 'task'),

    (t3_id, c2_id, admin_id,
      'Update contact form email recipient',
      'Please route contact form submissions to hello@thesdig.gr instead of the legacy address.',
      'resolved', 'normal', 'request'),

    (t4_id, c2_id, admin_id,
      'Heading sizes inconsistent across product pages',
      'The h2 on product listing pages seems larger than on the detail pages. Can you check the CSS?',
      'waiting_on_client', 'low', 'question'),

    (t5_id, c3_id, admin_id,
      'Site goes down nightly at 03:00',
      'Server appears to restart at 3am causing 5-10 min of downtime. Client presentation is Friday.',
      'open', 'critical', 'bug'),

    (t6_id, c3_id, admin_id,
      'Add cookie consent banner',
      'GDPR compliance — need a consent banner before our DPIA audit next month.',
      'closed', 'normal', 'request');

  -- Comments
  INSERT INTO public.ticket_comments (ticket_id, author_id, body, is_internal)
  VALUES
    (t1_id, admin_id, 'Looking into this now. Safari has known issues with certain scroll-driven animation triggers.', false),
    (t1_id, admin_id, 'Root cause confirmed: Safari 17 does not support animation-timeline without a polyfill. Adding one now.', true),
    (t2_id, admin_id, 'Started work on the card layout. Preview will be shared by end of week.', false),
    (t3_id, admin_id, 'Done. The form now routes to the new address. Please test and confirm receipt.', false),
    (t4_id, admin_id, 'Can you share a screenshot of the affected pages? Will help pinpoint it much faster.', false),
    (t5_id, admin_id, 'URGENT: Almost certainly a cron job causing a server restart. Coordinating with hosting provider now.', true),
    (t5_id, admin_id, 'We have identified the rogue cron task and disabled it. Monitoring overnight to confirm fix.', false),
    (t6_id, admin_id, 'Cookie banner implemented and live. GDPR consent is now captured and stored correctly.', false);

  -- Hours log
  INSERT INTO public.hours_log (ticket_id, retainer_id, agent_id, minutes, note)
  VALUES
    (t1_id, r1_id, admin_id, 90,  'Safari debugging and polyfill research'),
    (t2_id, r1_id, admin_id, 120, 'Design review + card implementation'),
    (t3_id, r2_id, admin_id, 30,  'Config update and testing'),
    (t5_id, r3_id, admin_id, 75,  'Hosting investigation and cron audit'),
    (t6_id, r3_id, admin_id, 180, 'Cookie consent implementation and testing');

END $$;
