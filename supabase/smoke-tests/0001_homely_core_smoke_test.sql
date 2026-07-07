-- Homely core smoke test for Supabase SQL Editor.
-- Run after supabase/migrations/0001_homely_core.sql,
-- supabase/migrations/0002_data_api_grants.sql,
-- supabase/migrations/0003_create_household_with_owner.sql and
-- supabase/migrations/0004_add_planner_sync_keys.sql and
-- supabase/migrations/0005_assignment_client_key_rpcs.sql.

with required_tables(table_name) as (
  values
    ('profiles'),
    ('households'),
    ('household_memberships'),
    ('tasks'),
    ('assignments'),
    ('meals'),
    ('household_invitations')
)
select
  required_tables.table_name,
  to_regclass('public.' || required_tables.table_name) is not null as exists
from required_tables
order by required_tables.table_name;

select
  relname as table_name,
  relrowsecurity as rls_enabled
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in (
    'profiles',
    'households',
    'household_memberships',
    'tasks',
    'assignments',
    'meals',
    'household_invitations'
  )
order by relname;

select
  proname as function_name
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in (
    'is_household_member',
    'can_manage_household',
    'is_household_owner',
    'current_membership_id',
    'create_household_with_owner',
    'mark_assignment_status',
    'mark_assignment_status_by_client_key',
    'update_assignment_member_by_client_key',
    'create_household_invitation',
    'accept_household_invitation'
  )
order by proname;

select
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles',
    'households',
    'household_memberships',
    'tasks',
    'assignments',
    'meals',
    'household_invitations'
  )
order by tablename, policyname;

select
  table_name,
  privilege_type
from information_schema.role_table_grants
where grantee = 'authenticated'
  and table_schema = 'public'
  and table_name in (
    'profiles',
    'households',
    'household_memberships',
    'tasks',
    'assignments',
    'meals',
    'household_invitations'
  )
order by table_name, privilege_type;

select
  table_name,
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and column_name = 'client_key'
  and table_name in (
    'household_memberships',
    'tasks',
    'assignments',
    'meals'
  )
order by table_name;
