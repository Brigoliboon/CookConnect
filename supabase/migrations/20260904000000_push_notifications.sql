create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.accounts(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.accounts(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_recipient on public.notifications(recipient_user_id, created_at desc);

alter table public.push_subscriptions enable row level security;
alter table public.notifications enable row level security;

drop policy if exists push_subscriptions_own on public.push_subscriptions;
create policy push_subscriptions_own on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists notifications_own_read on public.notifications;
create policy notifications_own_read on public.notifications
  for select using (auth.uid() = recipient_user_id);
