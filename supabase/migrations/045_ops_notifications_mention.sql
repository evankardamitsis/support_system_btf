-- In-app notification when a teammate @mentions you in internal notes.
alter table public.ops_notifications
  drop constraint if exists ops_notifications_type_check;

alter table public.ops_notifications
  add constraint ops_notifications_type_check check (type in (
    'task_assigned',
    'task_due',
    'task_overdue',
    'offer_accepted',
    'hosting_renewal',
    'project_completed',
    'mention'
  ));
