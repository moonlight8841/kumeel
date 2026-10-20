set local lock_timeout='3s';
set local statement_timeout='30s';
create or replace function public.kumeel_is_secure_editor() returns boolean
language sql stable security definer set search_path='' as $$
 select public.kumeel_has_active_session()
 and (select auth.jwt()->>'aal')='aal2'
 and exists(select 1 from public.kumeel_editors e join auth.users u on u.id=e.user_id
 where u.id=(select auth.uid()) and u.email_confirmed_at is not null
 and lower(u.email) in ('komeil9060@gmail.com','bobmorgann2@gmail.com'));
$$;
revoke all on function public.kumeel_is_secure_editor() from public,anon;
grant execute on function public.kumeel_is_secure_editor() to authenticated;
drop policy if exists "Kumeel secure storage" on storage.objects;
create policy "Kumeel secure storage" on storage.objects as restrictive for all to authenticated
 using(bucket_id not in ('kumeel-media','kumeel-books') or (select public.kumeel_is_secure_editor()))
 with check(bucket_id not in ('kumeel-media','kumeel-books') or (select public.kumeel_is_secure_editor()));
create policy "Kumeel editors inspect books" on storage.objects for select to authenticated
 using(bucket_id='kumeel-books' and (select public.kumeel_is_secure_editor()));
create policy "Kumeel editors upload books" on storage.objects for insert to authenticated
 with check(bucket_id='kumeel-books' and (select public.kumeel_is_secure_editor())
 and name ~ '^books/[0-9a-f-]+/[0-9a-f-]+[.]pdf$'
 and (storage.foldername(name))[2]=(select auth.uid())::text);
