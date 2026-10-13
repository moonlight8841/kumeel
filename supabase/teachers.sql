-- Teacher applications and moderated public profiles. Run on jigypvbqiuakdatkzoul.
begin;
create table if not exists public.kumeel_teacher_applications (
 user_id uuid primary key references auth.users(id),
 name text not null check(char_length(btrim(name)) between 2 and 60),
 specialty text not null check(char_length(btrim(specialty)) between 3 and 120),
 bio text not null check(char_length(btrim(bio)) between 80 and 3000),
 approach text not null check(char_length(btrim(approach)) between 30 and 2000),
 audience text not null check(char_length(btrim(audience)) between 3 and 200),
 languages text not null check(char_length(btrim(languages)) between 2 and 120),
 qualifications text not null default '' check(char_length(qualifications)<=2000),
 status text not null default 'pending' check(status in ('pending','published','changes_requested','rejected')),
 revision integer not null default 1,review_note text not null default '',updated_at timestamptz not null default now()
);
create table if not exists public.kumeel_teacher_profiles (
 id uuid primary key default gen_random_uuid(),
 application_id uuid not null unique references public.kumeel_teacher_applications(user_id),
 name text not null,specialty text not null,bio text not null,approach text not null,
 audience text not null,languages text not null,published_at timestamptz not null default now()
);
alter table public.kumeel_teacher_applications enable row level security;
alter table public.kumeel_teacher_profiles enable row level security;
revoke all on public.kumeel_teacher_applications,public.kumeel_teacher_profiles from public,anon,authenticated;
grant select on public.kumeel_teacher_applications to authenticated;
-- Internal linkage and private qualifications never reach visitors.
grant select(id,name,specialty,bio,approach,audience,languages,published_at) on public.kumeel_teacher_profiles to anon,authenticated;
drop policy if exists teacher_private on public.kumeel_teacher_applications;
create policy teacher_private on public.kumeel_teacher_applications for select to authenticated using(user_id=(select auth.uid()) or (select public.kumeel_is_secure_editor()));
drop policy if exists teacher_public on public.kumeel_teacher_profiles;
create policy teacher_public on public.kumeel_teacher_profiles for select to anon,authenticated using(true);
create or replace function public.kumeel_apply_teacher(p_revision integer,p_name text,p_specialty text,p_bio text,p_approach text,p_audience text,p_languages text,p_qualifications text)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=kumeel_private.community_actor(); old public.kumeel_teacher_applications;
begin
 -- Serialize both initial creation and subsequent edits for this account.
 perform 1 from auth.users where id=actor for update;
 select * into old from public.kumeel_teacher_applications where user_id=actor for update;
 if found then
  if old.revision is distinct from p_revision then raise exception 'COMMUNITY_CONFLICT'; end if;
  if old.status not in ('published','changes_requested') then raise exception 'COMMUNITY_LOCKED'; end if;
  perform kumeel_private.community_limit(actor,'write');
  update public.kumeel_teacher_applications set name=btrim(p_name),specialty=btrim(p_specialty),bio=btrim(p_bio),approach=btrim(p_approach),audience=btrim(p_audience),languages=btrim(p_languages),qualifications=p_qualifications,status='pending',revision=revision+1,updated_at=now() where user_id=actor;
 else
  perform kumeel_private.community_limit(actor,'write');
  insert into public.kumeel_teacher_applications(user_id,name,specialty,bio,approach,audience,languages,qualifications) values(actor,btrim(p_name),btrim(p_specialty),btrim(p_bio),btrim(p_approach),btrim(p_audience),btrim(p_languages),p_qualifications);
 end if;
 -- An approved profile remains visible unchanged until the revised application is reviewed.
end; $$;
create or replace function public.kumeel_review_teacher(p_user uuid,p_revision integer,p_decision text,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=kumeel_private.community_actor(); item public.kumeel_teacher_applications;
begin
 if not public.kumeel_is_secure_editor() then raise exception 'COMMUNITY_FORBIDDEN' using errcode='42501';end if;
 if p_decision is null or p_decision not in ('published','changes_requested','rejected') or p_note is null or char_length(p_note)>1000 then raise exception 'COMMUNITY_CONTENT';end if;
 if p_decision<>'published' and char_length(btrim(p_note))<3 then raise exception 'COMMUNITY_NOTE_REQUIRED';end if;
 select * into item from public.kumeel_teacher_applications where user_id=p_user for update;
 if not found then raise exception 'COMMUNITY_NOT_FOUND';end if;
 if item.revision is distinct from p_revision then raise exception 'COMMUNITY_CONFLICT';end if;
 if item.status not in ('pending','published') or (item.status='published' and p_decision='published') then raise exception 'COMMUNITY_LOCKED';end if;
 if p_decision='published' then
  insert into public.kumeel_teacher_profiles(application_id,name,specialty,bio,approach,audience,languages)
  values(item.user_id,item.name,item.specialty,item.bio,item.approach,item.audience,item.languages)
  on conflict(application_id) do update set name=excluded.name,specialty=excluded.specialty,bio=excluded.bio,approach=excluded.approach,audience=excluded.audience,languages=excluded.languages;
 else delete from public.kumeel_teacher_profiles where application_id=p_user;end if;
 update public.kumeel_teacher_applications set status=p_decision,review_note=btrim(p_note),revision=revision+1,updated_at=now() where user_id=p_user;
 insert into public.kumeel_review_log(item_id,item_kind,reviewer_id,decision,note,revision) values(p_user,'teacher',actor,p_decision,btrim(p_note),p_revision);
end; $$;
revoke all on function public.kumeel_apply_teacher(integer,text,text,text,text,text,text,text),public.kumeel_review_teacher(uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.kumeel_apply_teacher(integer,text,text,text,text,text,text,text),public.kumeel_review_teacher(uuid,integer,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
