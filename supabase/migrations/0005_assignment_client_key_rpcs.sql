-- Client-key RPCs let the mobile app update assignments without knowing Supabase UUIDs.

create or replace function public.mark_assignment_status_by_client_key(
  target_household_id uuid,
  target_assignment_client_key text,
  target_status public.assignment_status
)
returns public.assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  assignment_row public.assignments;
  actor_membership_id uuid;
begin
  select *
  into assignment_row
  from public.assignments
  where household_id = target_household_id
    and client_key = target_assignment_client_key
    and deleted_at is null
  limit 1;

  if assignment_row.id is null then
    raise exception 'assignment_not_found';
  end if;

  actor_membership_id := public.current_membership_id(target_household_id);

  if actor_membership_id is null then
    raise exception 'not_household_member';
  end if;

  update public.assignments
  set
    status = target_status,
    completed_by_member_id = case when target_status = 'done' then actor_membership_id else null end,
    updated_at = now()
  where id = assignment_row.id
  returning * into assignment_row;

  return assignment_row;
end;
$$;

create or replace function public.update_assignment_member_by_client_key(
  target_household_id uuid,
  target_assignment_client_key text,
  target_member_client_key text
)
returns public.assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  assignment_row public.assignments;
  target_member_id uuid;
begin
  if not public.can_manage_household(target_household_id) then
    raise exception 'not_allowed';
  end if;

  select id
  into target_member_id
  from public.household_memberships
  where household_id = target_household_id
    and client_key = target_member_client_key
    and deleted_at is null
  limit 1;

  if target_member_id is null then
    raise exception 'member_not_found';
  end if;

  update public.assignments
  set
    member_id = target_member_id,
    updated_at = now()
  where household_id = target_household_id
    and client_key = target_assignment_client_key
    and deleted_at is null
  returning * into assignment_row;

  if assignment_row.id is null then
    raise exception 'assignment_not_found';
  end if;

  return assignment_row;
end;
$$;

revoke all on function public.mark_assignment_status_by_client_key(uuid, text, public.assignment_status) from public;
revoke all on function public.update_assignment_member_by_client_key(uuid, text, text) from public;

grant execute on function public.mark_assignment_status_by_client_key(uuid, text, public.assignment_status) to authenticated;
grant execute on function public.update_assignment_member_by_client_key(uuid, text, text) to authenticated;
