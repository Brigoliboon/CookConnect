drop policy if exists notifications_own_update on public.notifications;
create policy notifications_own_update on public.notifications
  for update using (auth.uid() = recipient_user_id)
  with check (auth.uid() = recipient_user_id);
