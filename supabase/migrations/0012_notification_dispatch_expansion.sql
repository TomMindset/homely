-- Expands server-side notification dispatch beyond direct task reminders.
-- Adds daily overdue summaries for members and household status summaries for managers.

alter table public.notification_log
drop constraint if exists notification_log_notification_type_check;

alter table public.notification_log
add constraint notification_log_notification_type_check
check (notification_type in ('task_reminder', 'task_overdue', 'household_summary')) not valid;

alter table public.notification_log
add column if not exists notification_key text,
add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.notification_log
set notification_key = coalesce(
  notification_key,
  notification_type || ':' || coalesce(assignment_id::text, household_id::text) || ':' || to_char(due_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
)
where notification_key is null;

create unique index if not exists notification_log_user_household_type_key_unique
on public.notification_log (user_id, household_id, notification_type, notification_key)
where notification_key is not null;

grant select, insert, update on table public.notification_log to service_role;
grant select on table public.tasks to service_role;
grant select on table public.assignments to service_role;
grant select on table public.households to service_role;
grant select on table public.household_memberships to service_role;
grant select on table public.notification_preferences to service_role;

create or replace function public.apply_notification_quiet_hours(
  raw_due_at timestamptz,
  preference_timezone text default 'Europe/Berlin',
  quiet_hours_start text default null,
  quiet_hours_end text default null
)
returns timestamptz
language sql
stable
set search_path = public
as $$
  with normalized as (
    select
      raw_due_at,
      coalesce(nullif(preference_timezone, ''), 'Europe/Berlin') as target_timezone,
      case
        when quiet_hours_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then quiet_hours_start::time
        else null
      end as quiet_start_at,
      case
        when quiet_hours_end ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then quiet_hours_end::time
        else null
      end as quiet_end_at
  ),
  local_values as (
    select
      *,
      raw_due_at at time zone target_timezone as local_due_at
    from normalized
  )
  select
    case
      when quiet_start_at is null
        or quiet_end_at is null
        or quiet_start_at = quiet_end_at
        then raw_due_at
      when quiet_start_at < quiet_end_at
        and local_due_at::time >= quiet_start_at
        and local_due_at::time < quiet_end_at
        then ((local_due_at::date + quiet_end_at) at time zone target_timezone)
      when quiet_start_at > quiet_end_at
        and local_due_at::time >= quiet_start_at
        then (((local_due_at::date + 1) + quiet_end_at) at time zone target_timezone)
      when quiet_start_at > quiet_end_at
        and local_due_at::time < quiet_end_at
        then ((local_due_at::date + quiet_end_at) at time zone target_timezone)
      else raw_due_at
    end
  from local_values;
$$;

grant execute on function public.apply_notification_quiet_hours(timestamptz, text, text, text) to service_role;

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
      public.apply_notification_quiet_hours(
        (
          (
            assignment.date - greatest(coalesce(task.reminder_lead_days, 0), 0)
          )
          + case
              when coalesce(task.reminder_time, '') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
                then task.reminder_time::time
              else time '18:00'
            end
        ) at time zone coalesce(nullif(preference.timezone, ''), 'Europe/Berlin'),
        coalesce(nullif(preference.timezone, ''), 'Europe/Berlin'),
        nullif(preference.quiet_hours_start, ''),
        nullif(preference.quiet_hours_end, '')
      ) as due_at
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
    select
      *,
      'task:' || assignment_id::text || ':' || to_char(due_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as notification_key
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
      notification_key,
      due_at,
      status,
      metadata
    )
    select
      candidate.user_id,
      candidate.household_id,
      candidate.assignment_id,
      candidate.task_id,
      'task_reminder',
      candidate.notification_key,
      candidate.due_at,
      'pending',
      jsonb_build_object('memberName', candidate.member_name, 'taskTitle', candidate.task_title)
    from due_candidates candidate
    on conflict do nothing
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

create or replace function public.claim_overdue_task_summaries(
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
  due_at timestamptz,
  notification_type text,
  notification_key text,
  open_count integer,
  done_count integer,
  overdue_count integer,
  oldest_due_date date
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with member_preferences as (
    select
      membership.id as member_id,
      membership.user_id,
      membership.household_id,
      household.name as household_name,
      membership.display_name as member_name,
      coalesce(nullif(preference.timezone, ''), 'Europe/Berlin') as preference_timezone,
      nullif(preference.quiet_hours_start, '') as quiet_hours_start,
      nullif(preference.quiet_hours_end, '') as quiet_hours_end,
      (target_window_end at time zone coalesce(nullif(preference.timezone, ''), 'Europe/Berlin'))::date as local_today
    from public.household_memberships membership
    join public.households household on household.id = membership.household_id
    join public.notification_preferences preference on preference.user_id = membership.user_id
    where membership.deleted_at is null
      and membership.user_id is not null
      and household.deleted_at is null
      and preference.overdue_reminders_enabled is true
      and exists (
        select 1
        from public.push_tokens token
        where token.user_id = membership.user_id
          and token.disabled_at is null
      )
  ),
  overdue_candidates as (
    select
      preference.user_id,
      preference.household_id,
      preference.household_name,
      preference.member_name,
      preference.local_today,
      public.apply_notification_quiet_hours(
        (preference.local_today + time '09:00') at time zone preference.preference_timezone,
        preference.preference_timezone,
        preference.quiet_hours_start,
        preference.quiet_hours_end
      ) as due_at,
      count(*)::integer as overdue_count,
      min(assignment.date)::date as oldest_due_date
    from member_preferences preference
    join public.assignments assignment on assignment.member_id = preference.member_id
    join public.tasks task on task.id = assignment.task_id
    where assignment.deleted_at is null
      and assignment.status = 'open'
      and assignment.date is not null
      and assignment.date < preference.local_today
      and task.deleted_at is null
    group by
      preference.user_id,
      preference.household_id,
      preference.household_name,
      preference.member_name,
      preference.local_today,
      preference.preference_timezone,
      preference.quiet_hours_start,
      preference.quiet_hours_end
  ),
  due_candidates as (
    select
      *,
      'overdue:' || local_today::text as notification_key
    from overdue_candidates candidate
    where candidate.overdue_count > 0
      and candidate.due_at >= target_window_start
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
      notification_key,
      due_at,
      status,
      metadata
    )
    select
      candidate.user_id,
      candidate.household_id,
      null,
      null,
      'task_overdue',
      candidate.notification_key,
      candidate.due_at,
      'pending',
      jsonb_build_object(
        'memberName', candidate.member_name,
        'overdueCount', candidate.overdue_count,
        'oldestDueDate', candidate.oldest_due_date
      )
    from due_candidates candidate
    on conflict do nothing
    returning
      id,
      user_id,
      household_id,
      notification_type,
      notification_key,
      due_at,
      metadata
  )
  select
    log.id as log_id,
    log.user_id,
    log.household_id,
    candidate.household_name,
    null::uuid as assignment_id,
    null::uuid as task_id,
    null::text as task_title,
    candidate.member_name,
    log.due_at,
    log.notification_type,
    log.notification_key,
    0::integer as open_count,
    0::integer as done_count,
    candidate.overdue_count,
    candidate.oldest_due_date
  from inserted_logs log
  join due_candidates candidate
    on candidate.user_id = log.user_id
   and candidate.household_id = log.household_id
   and candidate.notification_key = log.notification_key;
end;
$$;

revoke all on function public.claim_overdue_task_summaries(timestamptz, timestamptz, integer) from public;
grant execute on function public.claim_overdue_task_summaries(timestamptz, timestamptz, integer) to service_role;

create or replace function public.claim_household_status_summaries(
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
  due_at timestamptz,
  notification_type text,
  notification_key text,
  open_count integer,
  done_count integer,
  overdue_count integer,
  oldest_due_date date
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with manager_preferences as (
    select
      membership.user_id,
      membership.household_id,
      household.name as household_name,
      membership.display_name as member_name,
      coalesce(nullif(preference.timezone, ''), 'Europe/Berlin') as preference_timezone,
      nullif(preference.quiet_hours_start, '') as quiet_hours_start,
      nullif(preference.quiet_hours_end, '') as quiet_hours_end,
      (target_window_end at time zone coalesce(nullif(preference.timezone, ''), 'Europe/Berlin'))::date as local_today
    from public.household_memberships membership
    join public.households household on household.id = membership.household_id
    join public.notification_preferences preference on preference.user_id = membership.user_id
    where membership.deleted_at is null
      and membership.user_id is not null
      and membership.role in ('owner', 'adult')
      and household.deleted_at is null
      and preference.household_summary_enabled is true
      and exists (
        select 1
        from public.push_tokens token
        where token.user_id = membership.user_id
          and token.disabled_at is null
      )
  ),
  status_candidates as (
    select
      preference.user_id,
      preference.household_id,
      preference.household_name,
      preference.member_name,
      preference.local_today,
      public.apply_notification_quiet_hours(
        (preference.local_today + time '18:00') at time zone preference.preference_timezone,
        preference.preference_timezone,
        preference.quiet_hours_start,
        preference.quiet_hours_end
      ) as due_at,
      count(*) filter (where assignment.status = 'open')::integer as open_count,
      count(*) filter (where assignment.status = 'done')::integer as done_count,
      count(*) filter (where assignment.status = 'open' and assignment.date < preference.local_today)::integer as overdue_count,
      min(assignment.date) filter (where assignment.status = 'open' and assignment.date < preference.local_today)::date as oldest_due_date
    from manager_preferences preference
    join public.assignments assignment on assignment.household_id = preference.household_id
    join public.tasks task on task.id = assignment.task_id
    where assignment.deleted_at is null
      and assignment.date is not null
      and (
        assignment.date = preference.local_today
        or (assignment.status = 'open' and assignment.date < preference.local_today)
      )
      and task.deleted_at is null
    group by
      preference.user_id,
      preference.household_id,
      preference.household_name,
      preference.member_name,
      preference.local_today,
      preference.preference_timezone,
      preference.quiet_hours_start,
      preference.quiet_hours_end
  ),
  due_candidates as (
    select
      *,
      'household-summary:' || local_today::text as notification_key
    from status_candidates candidate
    where (candidate.open_count + candidate.done_count) > 0
      and candidate.due_at >= target_window_start
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
      notification_key,
      due_at,
      status,
      metadata
    )
    select
      candidate.user_id,
      candidate.household_id,
      null,
      null,
      'household_summary',
      candidate.notification_key,
      candidate.due_at,
      'pending',
      jsonb_build_object(
        'memberName', candidate.member_name,
        'openCount', candidate.open_count,
        'doneCount', candidate.done_count,
        'overdueCount', candidate.overdue_count,
        'oldestDueDate', candidate.oldest_due_date
      )
    from due_candidates candidate
    on conflict do nothing
    returning
      id,
      user_id,
      household_id,
      notification_type,
      notification_key,
      due_at,
      metadata
  )
  select
    log.id as log_id,
    log.user_id,
    log.household_id,
    candidate.household_name,
    null::uuid as assignment_id,
    null::uuid as task_id,
    null::text as task_title,
    candidate.member_name,
    log.due_at,
    log.notification_type,
    log.notification_key,
    candidate.open_count,
    candidate.done_count,
    candidate.overdue_count,
    candidate.oldest_due_date
  from inserted_logs log
  join due_candidates candidate
    on candidate.user_id = log.user_id
   and candidate.household_id = log.household_id
   and candidate.notification_key = log.notification_key;
end;
$$;

revoke all on function public.claim_household_status_summaries(timestamptz, timestamptz, integer) from public;
grant execute on function public.claim_household_status_summaries(timestamptz, timestamptz, integer) to service_role;
