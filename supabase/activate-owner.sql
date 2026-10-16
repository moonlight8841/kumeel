-- Approved owners on project jigypvbqiuakdatkzoul. No account or email is created here.
-- Membership is prepared for existing accounts; secure access still requires confirmed email.
-- Additive and repeatable: preserve the existing owner's membership.
begin;
lock table public.kumeel_editors in exclusive mode;
insert into public.kumeel_editors(user_id)
select id from auth.users
where lower(email) in ('komeil9060@gmail.com','bobmorgann2@gmail.com')
on conflict(user_id) do nothing;
commit;
select u.email,u.email_confirmed_at is not null as confirmed
from public.kumeel_editors e join auth.users u on u.id=e.user_id;
