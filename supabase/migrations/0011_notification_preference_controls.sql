-- Push preference controls for paid-quality reminders.
-- Adds user-facing notification switches and applies quiet hours during task reminder claims.

alter table public.notification_preferences
add column if not exists overdue_reminders_enabled boolean not null default true,
add column if not exists household_summary_enabled boolean not null default false,
add column if not exists timezone text not null default 'Europe/Berlin';

alter table public.notification_preferences
alter column quiet_hours_start set default '21:00',
alter column quiet_hours_end set default '07:00';

update public.notification_preferences
set
  quiet_hours_start = coalesce(nullif(quiet_hours_start, ''), '21:00'),
  quiet_hours_end = coalesce(nullif(quiet_hours_end, ''), '07:00'),
  timezone = coalesce(nullif(timezone, ''), 'Europe/Berlin')
where
  quiet_hours_start is null
  or quiet_hours_start = ''
  or quiet_hours_end is null
  or quiet_hours_end = ''
  or timezone is null
  or timezone = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notification_preferences_quiet_start_format'
  ) then
    alter table public.notification_preferences
    add constraint notification_preferences_quiet_start_format
    check (quiet_hours_start is null or quiet_hours_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'notification_preferences_quiet_end_format'
  ) then
    alter table public.notification_preferences
    add constraint notification_preferences_quiet_end_format
    check (quiet_hours_end is null or quiet_hours_end ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') not valid;
  end if;
end $$;

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
      coalesce(nullif(preference.timezone, ''), 'Europe/Berlin') as preference_timezone,
      nullif(preference.quiet_hours_start, '') as quiet_hours_start,
      nullif(preference.quiet_hours_end, '') as quiet_hours_end,
      (
        (
          assignment.date - greatest(coalesce(task.reminder_lead_days, 0), 0)
        )
        + case
            when coalesce(task.reminder_time, '') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
              then task.reminder_time::time
            else time '18:00'
          end
      ) at time zone coalesce(nullif(preference.timezone, ''), 'Europe/Berlin') as raw_due_at
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
  quiet_windows as (
    select
      candidate.*,
      candidate.raw_due_at at time zone candidate.preference_timezone as local_due_at,
      case
        when candidate.quiet_hours_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
          then candidate.quiet_hours_start::time
        else null
      end as quiet_start_at,
      case
        when candidate.quiet_hours_end ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
          then candidate.quiet_hours_end::time
        else null
      end as quiet_end_at
    from reminder_candidates candidate
  ),
  adjusted_candidates as (
    select
      candidate.assignment_id,
      candidate.household_id,
      candidate.household_name,
      candidate.task_id,
      candidate.task_title,
      candidate.user_id,
      candidate.member_name,
      case
        when candidate.quiet_start_at is null
          or candidate.quiet_end_at is null
          or candidate.quiet_start_at = candidate.quiet_end_at
          then candidate.raw_due_at
        when candidate.quiet_start_at < candidate.quiet_end_at
          and candidate.local_due_at::time >= candidate.quiet_start_at
          and candidate.local_due_at::time < candidate.quiet_end_at
          then ((candidate.local_due_at::date + candidate.quiet_end_at) at time zone candidate.preference_timezone)
        when candidate.quiet_start_at > candidate.quiet_end_at
          and candidate.local_due_at::time >= candidate.quiet_start_at
          then (((candidate.local_due_at::date + 1) + candidate.quiet_end_at) at time zone candidate.preference_timezone)
        when candidate.quiet_start_at > candidate.quiet_end_at
          and candidate.local_due_at::time < candidate.quiet_end_at
          then ((candidate.local_due_at::date + candidate.quiet_end_at) at time zone candidate.preference_timezone)
        else candidate.raw_due_at
      end as due_at
    from quiet_windows candidate
  ),
  due_candidates as (
    select *
    from adjusted_candidates candidate
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
