-- Homely Data API grants.
-- Run after 0001_homely_core.sql when "Automatically expose new tables" is disabled.

grant usage on schema public to authenticated;

grant select on table public.profiles to authenticated;
grant update on table public.profiles to authenticated;

grant select, insert, update, delete on table public.households to authenticated;
grant select, insert, update, delete on table public.household_memberships to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select, insert, update, delete on table public.assignments to authenticated;
grant select, insert, update, delete on table public.meals to authenticated;
grant select, insert, update on table public.household_invitations to authenticated;

grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.can_manage_household(uuid) to authenticated;
grant execute on function public.is_household_owner(uuid) to authenticated;
grant execute on function public.current_membership_id(uuid) to authenticated;
grant execute on function public.mark_assignment_status(uuid, public.assignment_status) to authenticated;
grant execute on function public.create_household_invitation(uuid, text, text, public.household_role, text, text) to authenticated;
grant execute on function public.accept_household_invitation(text) to authenticated;
