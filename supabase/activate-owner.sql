-- Run with a trusted database administrator after the owner verifies their email.
-- This grants content administration only; it does not create or confirm an account.
begin;
do $$
declare
  owner_id uuid;
  matches integer;
begin
  select count(*), (array_agg(id))[1] into matches, owner_id
  from auth.users
  where lower(email) = 'kumeelalnahab@gmail.com' and email_confirmed_at is not null;
  if matches <> 1 then
    raise exception 'Expected exactly one verified owner account; no permission was granted';
  end if;
  insert into public.kumeel_editors(user_id) values(owner_id) on conflict do nothing;
end $$;
commit;
-- Verify the grant without printing user credentials.
select exists (
  select 1 from public.kumeel_editors e join auth.users u on u.id = e.user_id
  where lower(u.email) = 'kumeelalnahab@gmail.com' and u.email_confirmed_at is not null
) as verified_owner_has_content_access;
