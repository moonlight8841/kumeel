-- Project: jigypvbqiuakdatkzoul. Run in SQL Editor as a database administrator.
-- Additional restrictive policies compose with existing membership/ownership policies.
begin;
create or replace function public.kumeel_has_active_session() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.sessions s where s.user_id=(select auth.uid())
  and s.id::text=(select auth.jwt()->>'session_id') and (s.not_after is null or s.not_after>now()));
$$;
revoke all on function public.kumeel_has_active_session() from public,anon;
grant execute on function public.kumeel_has_active_session() to authenticated;

create or replace function public.kumeel_is_secure_editor() returns boolean
language sql stable security definer set search_path = '' as $$
 select (select auth.jwt()->>'aal') = 'aal2' and public.kumeel_has_active_session() and exists (
  select 1 from public.kumeel_editors e join auth.users u on u.id = e.user_id
  where e.user_id = (select auth.uid()) and u.email_confirmed_at is not null
 );
$$;
revoke all on function public.kumeel_is_secure_editor() from public, anon;
grant execute on function public.kumeel_is_secure_editor() to authenticated;
drop policy if exists "Kumeel secure publication" on public.kumeel_published;
create policy "Kumeel secure publication" on public.kumeel_published as restrictive
for update to authenticated using ((select public.kumeel_is_secure_editor()))
with check ((select public.kumeel_is_secure_editor()));
drop policy if exists "Kumeel secure drafts" on public.kumeel_drafts;
create policy "Kumeel secure drafts" on public.kumeel_drafts as restrictive
for all to authenticated using ((select public.kumeel_is_secure_editor()))
with check ((select public.kumeel_is_secure_editor()));
drop policy if exists "Kumeel secure storage" on storage.objects;
create policy "Kumeel secure storage" on storage.objects as restrictive
for all to authenticated
using (bucket_id <> 'kumeel-media' or (select public.kumeel_is_secure_editor()))
with check (bucket_id <> 'kumeel-media' or (select public.kumeel_is_secure_editor()));
commit;
select tablename,policyname,permissive from pg_policies
where policyname in ('Kumeel secure publication','Kumeel secure drafts','Kumeel secure storage');
