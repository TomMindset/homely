-- Push notification foundation for Homely.
-- Stores opt-in device tokens and per-user notification preferences.

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null,
  platform text not null default 'unknown',
  device_name text,
  app_version text,
  disabled_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_tokens_user_token_unique unique (user_id, expo_push_token)
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  task_reminders_enabled boolean not null default true,
  assignment_updates_enabled boolean not null default true,
  quiet_hours_start text,
  quiet_hours_end text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists push_tokens_touch_updated_at on public.push_tokens;
create trigger push_tokens_touch_updated_at
before update on public.push_tokens
for each row execute function public.touch_updated_at();

drop trigger if exists notification_preferences_touch_updated_at on public.notification_preferences;
create trigger notification_preferences_touch_updated_at
before update on public.notification_preferences
for each row execute function public.touch_updated_at();

create index if not exists push_tokens_user_idx on public.push_tokens (user_id);
create index if not exists push_tokens_active_idx on public.push_tokens (user_id, disabled_at) where disabled_at is null;

alter table public.push_tokens enable row level security;
alter table public.notification_preferences enable row level security;

drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own"
on public.push_tokens for select
using (user_id = auth.uid());

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own"
on public.push_tokens for insert
with check (user_id = auth.uid());

drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own"
on public.push_tokens for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own"
on public.push_tokens for delete
using (user_id = auth.uid());

drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
create policy "notification_preferences_select_own"
on public.notification_preferences for select
using (user_id = auth.uid());

drop policy if exists "notification_preferences_insert_own" on public.notification_preferences;
create policy "notification_preferences_insert_own"
on public.notification_preferences for insert
with check (user_id = auth.uid());

drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own"
on public.notification_preferences for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select, insert, update, delete on table public.push_tokens to authenticated;
grant select, insert, update on table public.notification_preferences to authenticated;
