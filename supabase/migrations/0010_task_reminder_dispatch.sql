-- Server-side task reminder dispatch support.
-- Claims due assignment reminders atomically so scheduled Edge Functions do not send duplicates.

alter table public.notification_preferences
add column if not exists timezone text not null default 'Europe/Berlin';

create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  notification_type text not null check (notification_type in ('task_reminder')),
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  expo_ticket_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_log_task_reminder_unique unique (user_id, assignment_id, notification_type, due_at)
);

drop trigger if exists notification_log_touch_updated_at on public.notification_log;
create trigger notification_log_touch_updated_at
before update on public.notification_log
for each row execute function public.touch_updated_at();

create index if not exists notification_log_user_idx on public.notification_log (user_id);
create index if not exists notification_log_due_status_idx on public.notification_log (status, due_at);
create index if not exists notification_log_assignment_idx on public.notification_log (assignment_id);

alter table public.notification_log enable row level security;

drop policy if exists "notification_log_select_own" on public.notification_log;
create policy "notification_log_select_own"
on public.notification_log for select
using (user_id = auth.uid());

grant select on table public.notification_log to authenticated;
grant select, insert, update on table public.notification_log to service_role;
grant select, update on table public.push_tokens to service_role;
grant select on table public.notification_preferences to service_role;

create or replace function public.claim_due_task_reminders(
  target_window_start timestamptz default now() - interval '10 minutes',
  target_window_end timestamptz default now() + interval '15 minutes',
  target_max_items integer default 100
)
returns table (
  log_id uuid,
  user_id uuid,
  household_id uuid,
  household_name text,
  assignment_id uuid,
  task_id uuid,
  task_title text,
  member_name text,
  due_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with reminder_candidates as (
    select
      assignment.id as assignment_id,
      assignment.household_id,
      household.name as household_name,
      task.id as task_id,
      task.title as task_title,
      membership.user_id,
      membership.display_name as member_name,
      (
        (
          assignment.date - greatest(coalesce(task.reminder_lead_days, 0), 0)
        )
        + case
            when coalesce(task.reminder_time, '') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
              then task.reminder_time::time
            else time '18:00'
          end
      ) at time zone coalesce(nullif(preference.timezone, ''), 'Europe/Berlin') as due_at
    from public.assignments assignment
    join public.tasks task on task.id = assignment.task_id
    join public.households household on household.id = assignment.household_id
    join public.household_memberships membership on membership.id = assignment.member_id
    join public.notification_preferences preference on preference.user_id = membership.user_id
    where assignment.deleted_at is null
      and assignment.status = 'open'
      and assignment.date is not null
      and task.deleted_at is null
      and task.reminder_enabled is true
      and membership.deleted_at is null
      and membership.user_id is not null
      and household.deleted_at is null
      and preference.task_reminders_enabled is true
      and exists (
        select 1
        from public.push_tokens token
        where token.user_id = membership.user_id
          and token.disabled_at is null
      )
  ),
  due_candidates as (
    select *
    from reminder_candidates candidate
    where candidate.due_at >= target_window_start
      and candidate.due_at <= target_window_end
    order by candidate.due_at asc
    limit least(greatest(coalesce(target_max_items, 100), 1), 500)
  ),
  inserted_logs as (
    insert into public.notification_log (
      user_id,
      household_id,
      assignment_id,
      task_id,
      notification_type,
      due_at,
      status
    )
    select
      candidate.user_id,
      candidate.household_id,
      candidate.assignment_id,
      candidate.task_id,
      'task_reminder',
      candidate.due_at,
      'pending'
    from due_candidates candidate
    on conflict on constraint notification_log_task_reminder_unique do nothing
    returning
      id,
      user_id,
      household_id,
      assignment_id,
      task_id,
      due_at
  )
  select
    log.id as log_id,
    log.user_id,
    log.household_id,
    candidate.household_name,
    log.assignment_id,
    log.task_id,
    candidate.task_title,
    candidate.member_name,
    log.due_at
  from inserted_logs log
  join due_candidates candidate
    on candidate.assignment_id = log.assignment_id
   and candidate.user_id = log.user_id
   and candidate.due_at = log.due_at;
end;
$$;

revoke all on function public.claim_due_task_reminders(timestamptz, timestamptz, integer) from public;
grant execute on function public.claim_due_task_reminders(timestamptz, timestamptz, integer) to service_role;
