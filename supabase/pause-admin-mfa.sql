-- Optional MFA; active session and confirmed approved editor are still required.
begin;
create or replace function public.kumeel_has_active_session() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.sessions s where s.user_id=(select auth.uid())
  and s.id::text=(select auth.jwt()->>'session_id') and (s.not_after is null or s.not_after>now()));
$$;
revoke all on function public.kumeel_has_active_session() from public,anon;
grant execute on function public.kumeel_has_active_session() to authenticated;
create or replace function public.kumeel_is_secure_editor() returns boolean
language sql stable security definer set search_path='' as $$
 select public.kumeel_has_active_session() and exists(
  select 1 from public.kumeel_editors e join auth.users u on u.id=e.user_id
  where u.id=(select auth.uid()) and u.email_confirmed_at is not null
   and lower(u.email) in ('komeil9060@gmail.com','bobmorgann2@gmail.com'));
$$;
revoke all on function public.kumeel_is_secure_editor() from public,anon;
grant execute on function public.kumeel_is_secure_editor() to authenticated;
commit;
