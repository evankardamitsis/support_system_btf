alter table public.users
  add column if not exists portal_onboarding_completed_at timestamptz;

comment on column public.users.portal_onboarding_completed_at is
  'When the client completed or skipped the portal onboarding tour (once per account)';
