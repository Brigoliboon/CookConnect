-- FR-49: per-user opt-in for staff email notifications (new orders and new
-- subscription inquiries). Off by default; staff turn it on from the
-- notifications menu.
alter table public.accounts
  add column if not exists email_notifications boolean not null default false;
