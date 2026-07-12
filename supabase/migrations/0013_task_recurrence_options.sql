alter table public.tasks
  add column if not exists recurrence_interval_weeks integer,
  add column if not exists recurrence_day_of_month integer,
  add column if not exists recurrence_month integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tasks_recurrence_interval_weeks_range'
  ) then
    alter table public.tasks
      add constraint tasks_recurrence_interval_weeks_range
      check (recurrence_interval_weeks is null or recurrence_interval_weeks between 1 and 26)
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'tasks_recurrence_day_of_month_range'
  ) then
    alter table public.tasks
      add constraint tasks_recurrence_day_of_month_range
      check (recurrence_day_of_month is null or recurrence_day_of_month between 1 and 31)
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'tasks_recurrence_month_range'
  ) then
    alter table public.tasks
      add constraint tasks_recurrence_month_range
      check (recurrence_month is null or recurrence_month between 1 and 12)
      not valid;
  end if;
end $$;
