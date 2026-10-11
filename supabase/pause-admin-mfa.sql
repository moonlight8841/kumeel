-- Project: jigypvbqiuakdatkzoul. Temporary development configuration.
-- Keep all existing restrictive policies and confirmed editor membership checks.
begin;
create or replace function public.kumeel_is_secure_editor() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists (
  select 1 from public.kumeel_editors e join auth.users u on u.id = e.user_id
  where e.user_id = (select auth.uid()) and u.email_confirmed_at is not null
   and lower(u.email) = 'komeil9060@gmail.com'
 );
$$;
revoke all on function public.kumeel_is_secure_editor() from public, anon;
grant execute on function public.kumeel_is_secure_editor() to authenticated;
commit;
-- Before custom-domain launch: run harden-auth.sql and set requireAdminMfa=true.
