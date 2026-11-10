alter table public.subscriptions
  add column if not exists renewal_reminder_sent_at timestamptz,
  add column if not exists renewal_reminder_expires_at timestamptz,
  add column if not exists non_renewal_reason text,
  add column if not exists non_renewal_reason_at timestamptz;
