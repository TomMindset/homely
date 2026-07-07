-- Prepare account deletion before the Supabase Auth user is removed.
-- The mobile app must never hold a secret key, so Auth deletion happens in an Edge Function.

alter table public.households
  alter column created_by drop not null;

alter table public.households
  drop constraint if exists households_created_by_fkey;

alter table public.households
  add constraint households_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.household_invitations
  alter column created_by drop not null;

alter table public.household_invitations
  drop constraint if exists household_invitations_created_by_fkey;

alter table public.household_invitations
  add constraint household_invitations_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

create or replace function public.prepare_account_deletion()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  timestamp_now timestamptz := now();
  household_row record;
begin
  if actor_id is null then
    raise exception 'not_authenticated';
  end if;

  for household_row in
    select distinct household.id
    from public.households household
    left join public.household_memberships membership
      on membership.household_id = household.id
      and membership.user_id = actor_id
      and membership.role = 'owner'
      and membership.deleted_at is null
    where household.deleted_at is null
      and (household.created_by = actor_id or membership.id is not null)
  loop
    update public.household_invitations
    set
      status = case when status = 'open' then 'revoked'::public.invitation_status else status end,
      accepted_by = case when accepted_by = actor_id then null else accepted_by end,
      created_by = case when created_by = actor_id then null else created_by end
    where household_id = household_row.id;

    update public.assignments
    set deleted_at = coalesce(deleted_at, timestamp_now), updated_at = timestamp_now
    where household_id = household_row.id;

    update public.meals
    set deleted_at = coalesce(deleted_at, timestamp_now), updated_at = timestamp_now
    where household_id = household_row.id;

    update public.tasks
    set deleted_at = coalesce(deleted_at, timestamp_now), updated_at = timestamp_now
    where household_id = household_row.id;

    update public.household_memberships
    set
      user_id = null,
      display_name = 'Geloeschtes Mitglied',
      short_code = upper(substr(replace(id::text, '-', ''), 1, 4)),
      deleted_at = coalesce(deleted_at, timestamp_now),
      updated_at = timestamp_now
    where household_id = household_row.id;

    update public.households
    set
      created_by = null,
      deleted_at = coalesce(deleted_at, timestamp_now),
      updated_at = timestamp_now
    where id = household_row.id;
  end loop;

  update public.household_invitations
  set
    status = case when status = 'open' then 'revoked'::public.invitation_status else status end,
    accepted_by = case when accepted_by = actor_id then null else accepted_by end,
    created_by = case when created_by = actor_id then null else created_by end
  where created_by = actor_id
    or accepted_by = actor_id;

  update public.household_memberships
  set
    user_id = null,
    display_name = 'Geloeschtes Mitglied',
    short_code = upper(substr(replace(id::text, '-', ''), 1, 4)),
    deleted_at = coalesce(deleted_at, timestamp_now),
    updated_at = timestamp_now
  where user_id = actor_id;

  update public.tasks
  set created_by = null, updated_at = timestamp_now
  where created_by = actor_id;

  update public.profiles
  set
    email = 'deleted-' || actor_id::text || '@deleted.homely.local',
    display_name = null,
    updated_at = timestamp_now
  where id = actor_id;
end;
$$;

revoke all on function public.prepare_account_deletion() from public;
grant execute on function public.prepare_account_deletion() to authenticated;
