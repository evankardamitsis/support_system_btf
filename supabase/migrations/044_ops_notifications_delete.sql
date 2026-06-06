-- Allow users to dismiss their own in-app notifications.
create policy "ops_notifications_delete_own" on public.ops_notifications
  for delete using (auth.uid() = user_id);
