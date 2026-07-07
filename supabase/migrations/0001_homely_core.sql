-- Homely core schema for Supabase.
-- Run this migration after creating a Supabase project.

create extension if not exists pgcrypto;

create type public.household_role as enum ('owner', 'adult', 'child');
create type public.assignment_status as enum ('open', 'done', 'skipped', 'moved');
create type public.invitation_status as enum ('open', 'accepted', 'revoked', 'expired');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.household_memberships (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null check (length(trim(display_name)) > 0),
  short_code text not null check (length(trim(short_code)) between 1 and 4),
  role public.household_role not null default 'child',
  color text not null default '#256F63',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint household_memberships_one_user_per_household unique (household_id, user_id),
  constraint household_memberships_short_code unique (household_id, short_code)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  category text not null default 'custom',
  effort_units numeric(6, 2) not null default 1 check (effort_units > 0),
  recurrence_type text not null default 'once',
  scheduled_days text[] not null default '{}',
  recurrence_start_year integer,
  recurrence_start_week integer,
  reminder_enabled boolean not null default false,
  reminder_time text,
  reminder_lead_days integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  member_id uuid not null references public.household_memberships(id) on delete restrict,
  completed_by_member_id uuid references public.household_memberships(id) on delete set null,
  year integer not null,
  week integer not null check (week between 1 and 53),
  day text not null,
  day_index integer not null check (day_index between 1 and 7),
  date date,
  status public.assignment_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  year integer not null,
  week integer not null check (week between 1 and 53),
  day text not null,
  day_index integer not null check (day_index between 1 and 7),
  date date,
  title text not null default '',
  cook_member_id uuid references public.household_memberships(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint meals_one_day_per_household unique (household_id, year, week, day_index)
);

create table public.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  invited_email text,
  display_name text not null,
  short_code text not null,
  role public.household_role not null default 'child',
  color text not null default '#256F63',
  code_hash text not null,
  status public.invitation_status not null default 'open',
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger households_touch_updated_at
before update on public.households
for each row execute function public.touch_updated_at();

create trigger household_memberships_touch_updated_at
before update on public.household_memberships
for each row execute function public.touch_updated_at();

create trigger tasks_touch_updated_at
before update on public.tasks
for each row execute function public.touch_updated_at();

create trigger assignments_touch_updated_at
before update on public.assignments
for each row execute function public.touch_updated_at();

create trigger meals_touch_updated_at
before update on public.meals
for each row execute function public.touch_updated_at();

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger auth_users_create_profile
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.household_memberships membership
    where membership.household_id = target_household_id
      and membership.user_id = auth.uid()
      and membership.deleted_at is null
  );
$$;

create or replace function public.can_manage_household(target_household_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.household_memberships membership
    where membership.household_id = target_household_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'adult')
      and membership.deleted_at is null
  );
$$;

create or replace function public.is_household_owner(target_household_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.household_memberships membership
    where membership.household_id = target_household_id
      and membership.user_id = auth.uid()
      and membership.role = 'owner'
      and membership.deleted_at is null
  );
$$;

create or replace function public.current_membership_id(target_household_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select membership.id
  from public.household_memberships membership
  where membership.household_id = target_household_id
    and membership.user_id = auth.uid()
    and membership.deleted_at is null
  limit 1;
$$;

create or replace function public.mark_assignment_status(
  target_assignment_id uuid,
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
  where id = target_assignment_id
    and deleted_at is null;

  if assignment_row.id is null then
    raise exception 'assignment_not_found';
  end if;

  actor_membership_id := public.current_membership_id(assignment_row.household_id);

  if actor_membership_id is null then
    raise exception 'not_household_member';
  end if;

  update public.assignments
  set
    status = target_status,
    completed_by_member_id = case when target_status = 'done' then actor_membership_id else null end,
    updated_at = now()
  where id = target_assignment_id
  returning * into assignment_row;

  return assignment_row;
end;
$$;

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
set search_path = public
as $$
declare
  generated_code text;
begin
  if not public.can_manage_household(target_household_id) then
    raise exception 'not_allowed';
  end if;

  generated_code := upper(encode(gen_random_bytes(6), 'hex'));

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
    encode(digest(generated_code, 'sha256'), 'hex'),
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
set search_path = public
as $$
declare
  invitation_row public.household_invitations;
  membership_row public.household_memberships;
begin
  select *
  into invitation_row
  from public.household_invitations
  where code_hash = encode(digest(upper(trim(invitation_code)), 'sha256'), 'hex')
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

revoke all on function public.is_household_member(uuid) from public;
revoke all on function public.can_manage_household(uuid) from public;
revoke all on function public.is_household_owner(uuid) from public;
revoke all on function public.current_membership_id(uuid) from public;
revoke all on function public.mark_assignment_status(uuid, public.assignment_status) from public;
revoke all on function public.create_household_invitation(uuid, text, text, public.household_role, text, text) from public;
revoke all on function public.accept_household_invitation(text) from public;

grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.can_manage_household(uuid) to authenticated;
grant execute on function public.is_household_owner(uuid) to authenticated;
grant execute on function public.current_membership_id(uuid) to authenticated;
grant execute on function public.mark_assignment_status(uuid, public.assignment_status) to authenticated;
grant execute on function public.create_household_invitation(uuid, text, text, public.household_role, text, text) to authenticated;
grant execute on function public.accept_household_invitation(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_memberships enable row level security;
alter table public.tasks enable row level security;
alter table public.assignments enable row level security;
alter table public.meals enable row level security;
alter table public.household_invitations enable row level security;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "households_select_member"
on public.households for select
to authenticated
using (public.is_household_member(id));

create policy "households_select_creator"
on public.households for select
to authenticated
using ((select auth.uid()) = created_by);

create policy "households_insert_authenticated"
on public.households for insert
to authenticated
with check ((select auth.uid()) = created_by);

create policy "households_update_manager"
on public.households for update
to authenticated
using (public.can_manage_household(id))
with check (public.can_manage_household(id));

create policy "households_delete_owner"
on public.households for delete
to authenticated
using (public.is_household_owner(id));

create policy "memberships_select_member"
on public.household_memberships for select
to authenticated
using (public.is_household_member(household_id));

create policy "memberships_insert_manager"
on public.household_memberships for insert
to authenticated
with check (
  public.can_manage_household(household_id)
  or (
    user_id = (select auth.uid())
    and role = 'owner'
    and exists (
      select 1
      from public.households household
      where household.id = household_id
        and household.created_by = (select auth.uid())
    )
    and not exists (
      select 1
      from public.household_memberships existing
      where existing.household_id = household_id
    )
  )
);

create policy "memberships_update_manager"
on public.household_memberships for update
to authenticated
using (public.can_manage_household(household_id))
with check (public.can_manage_household(household_id));

create policy "memberships_delete_manager"
on public.household_memberships for delete
to authenticated
using (public.can_manage_household(household_id));

create policy "tasks_select_member"
on public.tasks for select
to authenticated
using (public.is_household_member(household_id));

create policy "tasks_insert_manager"
on public.tasks for insert
to authenticated
with check (public.can_manage_household(household_id));

create policy "tasks_update_manager"
on public.tasks for update
to authenticated
using (public.can_manage_household(household_id))
with check (public.can_manage_household(household_id));

create policy "tasks_delete_manager"
on public.tasks for delete
to authenticated
using (public.can_manage_household(household_id));

create policy "assignments_select_member"
on public.assignments for select
to authenticated
using (public.is_household_member(household_id));

create policy "assignments_insert_manager"
on public.assignments for insert
to authenticated
with check (public.can_manage_household(household_id));

create policy "assignments_update_manager"
on public.assignments for update
to authenticated
using (public.can_manage_household(household_id))
with check (public.can_manage_household(household_id));

create policy "assignments_delete_manager"
on public.assignments for delete
to authenticated
using (public.can_manage_household(household_id));

create policy "meals_select_member"
on public.meals for select
to authenticated
using (public.is_household_member(household_id));

create policy "meals_insert_manager"
on public.meals for insert
to authenticated
with check (public.can_manage_household(household_id));

create policy "meals_update_manager"
on public.meals for update
to authenticated
using (public.can_manage_household(household_id))
with check (public.can_manage_household(household_id));

create policy "meals_delete_manager"
on public.meals for delete
to authenticated
using (public.can_manage_household(household_id));

create policy "invitations_select_manager"
on public.household_invitations for select
to authenticated
using (public.can_manage_household(household_id));

create policy "invitations_insert_manager"
on public.household_invitations for insert
to authenticated
with check (public.can_manage_household(household_id));

create policy "invitations_update_manager"
on public.household_invitations for update
to authenticated
using (public.can_manage_household(household_id))
with check (public.can_manage_household(household_id));

create index household_memberships_household_idx on public.household_memberships (household_id);
create index household_memberships_user_idx on public.household_memberships (user_id);
create index tasks_household_idx on public.tasks (household_id);
create index assignments_household_week_idx on public.assignments (household_id, year, week);
create index assignments_member_week_idx on public.assignments (member_id, year, week);
create index meals_household_week_idx on public.meals (household_id, year, week);
create index household_invitations_household_idx on public.household_invitations (household_id);
