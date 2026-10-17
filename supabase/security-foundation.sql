-- Project jigypvbqiuakdatkzoul. Additive; depends on community.sql and chat.sql.
-- Optional MFA is unchanged. Counters contain no prompts or raw IP addresses.
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
create or replace function kumeel_private.community_actor() returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if not public.kumeel_has_active_session() or actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then
  raise exception 'COMMUNITY_AUTH' using errcode='42501';
 end if;
 return actor;
end; $$;
-- Do not let unexpired tokens from signed-out sessions read private account data.
do $$ declare target text;begin
 foreach target in array array['kumeel_editors','kumeel_submissions','kumeel_community_comments','kumeel_writing_responses','kumeel_teacher_applications'] loop
  if to_regclass('public.'||target) is not null then
   execute format('drop policy if exists kumeel_active_session on public.%I',target);
   execute format('create policy kumeel_active_session on public.%I as restrictive for all to authenticated using ((select public.kumeel_has_active_session())) with check ((select public.kumeel_has_active_session()))',target);
  end if;
 end loop;
end; $$;
create table if not exists kumeel_private.owner_ai_limits(
 scope text primary key check(scope in ('assist','idea')),
 cooldown_seconds integer not null check(cooldown_seconds between 1 and 3600),
 per_day integer not null check(per_day between 1 and 2000)
);
insert into kumeel_private.owner_ai_limits values('assist',8,120),('idea',30,30) on conflict do nothing;
create table if not exists kumeel_private.owner_ai_quota(
 actor uuid not null references auth.users(id) on delete cascade,
 scope text not null references kumeel_private.owner_ai_limits(scope),
 day date not null default current_date,used integer not null default 0,
 last_request timestamptz,primary key(actor,scope)
);
alter table kumeel_private.owner_ai_limits enable row level security;
alter table kumeel_private.owner_ai_quota enable row level security;
revoke all on kumeel_private.owner_ai_limits,kumeel_private.owner_ai_quota from public,anon,authenticated;
create or replace function public.kumeel_owner_ai_take(p_secret text,p_actor uuid,p_scope text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare limits kumeel_private.owner_ai_limits; quota kumeel_private.owner_ai_quota; stamp timestamptz; local_day date; retry integer;
begin
 if p_secret is null or char_length(p_secret) not between 32 and 256 or not exists(select 1 from kumeel_private.chat_settings s where s.id=1 and s.secret_hash=encode(extensions.digest(p_secret,'sha256'),'hex')) then
  raise exception 'QUOTA_FORBIDDEN' using errcode='42501';
 end if;
 if not exists(select 1 from public.kumeel_editors e join auth.users u on u.id=e.user_id where u.id=p_actor and u.email_confirmed_at is not null and lower(u.email) in ('komeil9060@gmail.com','bobmorgann2@gmail.com')) then
  raise exception 'QUOTA_FORBIDDEN' using errcode='42501';
 end if;
 select * into limits from kumeel_private.owner_ai_limits where scope=p_scope;
 if not found then raise exception 'QUOTA_SCOPE' using errcode='22023'; end if;
 insert into kumeel_private.owner_ai_quota(actor,scope) values(p_actor,p_scope) on conflict do nothing;
 select * into quota from kumeel_private.owner_ai_quota where actor=p_actor and scope=p_scope for update;
 stamp=clock_timestamp();local_day=(stamp at time zone 'Asia/Riyadh')::date;
 if quota.day<>local_day then quota.used=0;end if;
 if quota.used>=limits.per_day then
  retry=greatest(1,ceil(extract(epoch from((((local_day+1)::timestamp at time zone 'Asia/Riyadh')-stamp))))::integer);
  return jsonb_build_object('allowed',false,'reason','daily','retry_after',retry,'remaining',0);
 end if;
 if quota.last_request is not null and stamp-quota.last_request<make_interval(secs=>limits.cooldown_seconds) then
  retry=greatest(1,ceil(limits.cooldown_seconds-extract(epoch from(stamp-quota.last_request)))::integer);
  return jsonb_build_object('allowed',false,'reason','cooldown','retry_after',retry,'remaining',limits.per_day-quota.used);
 end if;
 update kumeel_private.owner_ai_quota set day=local_day,used=quota.used+1,last_request=stamp where actor=p_actor and scope=p_scope;
 return jsonb_build_object('allowed',true,'retry_after',0,'remaining',limits.per_day-quota.used-1);
end;
$$;
revoke all on function public.kumeel_owner_ai_take(text,uuid,text) from public,anon,authenticated;
grant execute on function public.kumeel_owner_ai_take(text,uuid,text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
