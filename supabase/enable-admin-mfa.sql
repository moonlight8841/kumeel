-- Apply ONLY after deploying the MFA enrollment/challenge UI.
-- Preserves the active-session requirement and existing editor allowlist.
begin;
set local lock_timeout = '3s';
create or replace function public.kumeel_is_secure_editor() returns boolean
language sql stable security definer set search_path = '' as $$
 select public.kumeel_has_active_session()
  and (select auth.jwt()->>'aal') = 'aal2'
  and exists (
   select 1 from public.kumeel_editors e join auth.users u on u.id=e.user_id
   where u.id=(select auth.uid()) and u.email_confirmed_at is not null
    and lower(u.email) in ('komeil9060@gmail.com','bobmorgann2@gmail.com')
  );
$$;
revoke all on function public.kumeel_is_secure_editor() from public, anon;
grant execute on function public.kumeel_is_secure_editor() to authenticated;
commit;
