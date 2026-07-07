-- Soft-delete a complete household tree.
-- Only the household owner may run this. Auth users are not deleted here.

create or replace function public.delete_household_with_data(target_household_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  timestamp_now timestamptz := now();
begin
  if not public.is_household_owner(target_household_id) then
    raise exception 'not_household_owner';
  end if;

  update public.household_invitations
  set status = case when status = 'open' then 'revoked'::public.invitation_status else status end
  where household_id = target_household_id;

  update public.assignments
  set deleted_at = coalesce(deleted_at, timestamp_now), updated_at = timestamp_now
  where household_id = target_household_id;

  update public.meals
  set deleted_at = coalesce(deleted_at, timestamp_now), updated_at = timestamp_now
  where household_id = target_household_id;

  update public.tasks
  set deleted_at = coalesce(deleted_at, timestamp_now), updated_at = timestamp_now
  where household_id = target_household_id;

  update public.household_memberships
  set deleted_at = coalesce(deleted_at, timestamp_now), updated_at = timestamp_now
  where household_id = target_household_id;

  update public.households
  set deleted_at = coalesce(deleted_at, timestamp_now), updated_at = timestamp_now
  where id = target_household_id;
end;
$$;

revoke all on function public.delete_household_with_data(uuid) from public;
grant execute on function public.delete_household_with_data(uuid) to authenticated;
