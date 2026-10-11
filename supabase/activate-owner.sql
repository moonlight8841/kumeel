-- Run as a trusted database administrator in project jigypvbqiuakdatkzoul.
-- Only this confirmed account may administer content. No account is created here.
begin;
lock table public.kumeel_editors in exclusive mode;
delete from public.kumeel_editors;
do $$
declare owner_id uuid; matches integer;
begin
  select count(*), (array_agg(id))[1] into matches, owner_id
  from auth.users
  where lower(email) = 'komeil9060@gmail.com' and email_confirmed_at is not null;
  if matches = 1 then
    insert into public.kumeel_editors(user_id) values(owner_id);
  else
    raise notice 'Register and confirm komeil9060@gmail.com, then rerun. All previous editor grants have been revoked.';
  end if;
end $$;
commit;
select u.email, u.email_confirmed_at is not null as confirmed
from public.kumeel_editors e join auth.users u on u.id = e.user_id;
