-- Create the first household membership safely.
-- This avoids the bootstrap problem where a user cannot be manager before the owner membership exists.

create or replace function public.create_household_with_owner(
  target_name text,
  owner_display_name text,
  owner_short_code text,
  owner_color text default '#256F63'
)
returns table (
  household_id uuid,
  household_name text,
  household_created_by uuid,
  membership_id uuid,
  membership_user_id uuid,
  membership_display_name text,
  membership_short_code text,
  membership_role public.household_role,
  membership_color text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household public.households;
  new_membership public.household_memberships;
  actor_id uuid;
begin
  actor_id := auth.uid();

  if actor_id is null then
    raise exception 'not_authenticated';
  end if;

  if length(trim(target_name)) = 0 or length(trim(owner_display_name)) = 0 or length(trim(owner_short_code)) = 0 then
    raise exception 'missing_required_fields';
  end if;

  insert into public.households (name, created_by)
  values (trim(target_name), actor_id)
  returning * into new_household;

  insert into public.household_memberships (
    household_id,
    user_id,
    display_name,
    short_code,
    role,
    color
  )
  values (
    new_household.id,
    actor_id,
    trim(owner_display_name),
    upper(trim(owner_short_code)),
    'owner',
    owner_color
  )
  returning * into new_membership;

  household_id := new_household.id;
  household_name := new_household.name;
  household_created_by := new_household.created_by;
  membership_id := new_membership.id;
  membership_user_id := new_membership.user_id;
  membership_display_name := new_membership.display_name;
  membership_short_code := new_membership.short_code;
  membership_role := new_membership.role;
  membership_color := new_membership.color;

  return next;
end;
$$;

revoke all on function public.create_household_with_owner(text, text, text, text) from public;
grant execute on function public.create_household_with_owner(text, text, text, text) to authenticated;
