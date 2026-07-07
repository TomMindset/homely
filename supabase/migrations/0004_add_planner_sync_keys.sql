-- Stable client keys let the app sync local planner data to Supabase idempotently.
-- Supabase keeps UUID primary keys; the app keeps its local task/member/assignment ids as client_key.

alter table public.household_memberships
add column if not exists client_key text;

alter table public.tasks
add column if not exists client_key text;

alter table public.assignments
add column if not exists client_key text;

alter table public.meals
add column if not exists client_key text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'household_memberships_household_client_key_unique'
  ) then
    alter table public.household_memberships
    add constraint household_memberships_household_client_key_unique unique (household_id, client_key);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'tasks_household_client_key_unique'
  ) then
    alter table public.tasks
    add constraint tasks_household_client_key_unique unique (household_id, client_key);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'assignments_household_client_key_unique'
  ) then
    alter table public.assignments
    add constraint assignments_household_client_key_unique unique (household_id, client_key);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'meals_household_client_key_unique'
  ) then
    alter table public.meals
    add constraint meals_household_client_key_unique unique (household_id, client_key);
  end if;
end;
$$;
