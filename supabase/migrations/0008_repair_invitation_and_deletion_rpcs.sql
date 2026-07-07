-- Repair remote RPCs needed by multi-account testing and app cleanup.
-- Some Supabase projects expose pgcrypto functions through the extensions schema,
-- so schema-qualify them inside security definer functions.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.create_household_invitation(
  target_household_id uuid,
  target_display_name text,
  target_short_code text,
  target_role public.household_role default 'child',
  target_invited_email text default null,
  target_color text default '#256F63'
)
returns table (
  id uuid,
  invitation_code text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  generated_code text;
begin
  if not public.can_manage_household(target_household_id) then
    raise exception 'not_allowed';
  end if;

  generated_code := upper(encode(extensions.gen_random_bytes(6), 'hex'));

  insert into public.household_invitations (
    household_id,
    invited_email,
    display_name,
    short_code,
    role,
    color,
    code_hash,
    expires_at,
    created_by
  )
  values (
    target_household_id,
    nullif(trim(target_invited_email), ''),
    trim(target_display_name),
    upper(trim(target_short_code)),
    target_role,
    target_color,
    encode(extensions.digest(generated_code, 'sha256'), 'hex'),
    now() + interval '7 days',
    auth.uid()
  )
  returning household_invitations.id, generated_code, household_invitations.expires_at
  into id, invitation_code, expires_at;

  return next;
end;
$$;

create or replace function public.accept_household_invitation(invitation_code text)
returns public.household_memberships
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  invitation_row public.household_invitations;
  membership_row public.household_memberships;
begin
  select *
  into invitation_row
  from public.household_invitations
  where code_hash = encode(extensions.digest(upper(trim(invitation_code)), 'sha256'), 'hex')
    and status = 'open'
    and expires_at > now()
  limit 1;

  if invitation_row.id is null then
    raise exception 'invitation_not_found';
  end if;

  insert into public.household_memberships (
    household_id,
    user_id,
    display_name,
    short_code,
    role,
    color
  )
  values (
    invitation_row.household_id,
    auth.uid(),
    invitation_row.display_name,
    invitation_row.short_code,
    invitation_row.role,
    invitation_row.color
  )
  returning * into membership_row;

  update public.household_invitations
  set
    status = 'accepted',
    accepted_by = auth.uid(),
    accepted_at = now()
  where id = invitation_row.id;

  return membership_row;
end;
$$;

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

revoke all on function public.create_household_invitation(uuid, text, text, public.household_role, text, text) from public;
revoke all on function public.accept_household_invitation(text) from public;
revoke all on function public.delete_household_with_data(uuid) from public;

grant execute on function public.create_household_invitation(uuid, text, text, public.household_role, text, text) to authenticated;
grant execute on function public.accept_household_invitation(text) to authenticated;
grant execute on function public.delete_household_with_data(uuid) to authenticated;
