-- Kumeel: moderated member publishing. Additive; existing owner publishing is unchanged.
-- Run on jigypvbqiuakdatkzoul. Entire setup is transactional and repeatable.
begin;
create schema if not exists kumeel_private;
revoke all on schema kumeel_private from public, anon, authenticated;
create table if not exists public.kumeel_submissions (
 id uuid primary key default gen_random_uuid(), author_id uuid not null references auth.users(id),
 author_name text not null check(char_length(btrim(author_name)) between 2 and 60),
 title text not null check(char_length(btrim(title)) between 3 and 160),
 body text not null check(char_length(body) between 1 and 20000),
 category text not null check(category in ('فلسفة','علم','ثقافة','تأملات')),
 sources text not null default '' check(char_length(sources)<=3000), assisted boolean not null default false,
 rights_confirmed boolean not null default false,
 status text not null default 'draft' check(status in ('draft','pending','published','changes_requested','rejected')),
 review_note text not null default '' check(char_length(review_note)<=1000),
 revision integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.kumeel_community_posts (
 id uuid primary key references public.kumeel_submissions(id), author_name text not null,
 title text not null, body text not null, category text not null, sources text not null,
 assisted boolean not null, published_at timestamptz not null default now()
);
create table if not exists public.kumeel_community_comments (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.kumeel_submissions(id),
 author_id uuid not null references auth.users(id), author_name text not null check(char_length(btrim(author_name)) between 2 and 60),
 body text not null check(char_length(btrim(body)) between 10 and 2000),
 status text not null default 'pending' check(status in ('pending','published','rejected')),
 revision integer not null default 1, created_at timestamptz not null default now()
);
create table if not exists public.kumeel_public_comments (
 id uuid primary key references public.kumeel_community_comments(id),
 post_id uuid not null references public.kumeel_community_posts(id) on delete cascade,
 author_name text not null, body text not null, published_at timestamptz not null default now()
);
create table if not exists public.kumeel_review_log (
 id uuid primary key default gen_random_uuid(), item_id uuid not null, item_kind text not null,
 reviewer_id uuid not null references auth.users(id), decision text not null, note text not null,
 revision integer not null, created_at timestamptz not null default now()
);
create table if not exists kumeel_private.community_quota (
 user_id uuid primary key references auth.users(id), day date not null default current_date,
 posts integer not null default 0, comments integer not null default 0, writes integer not null default 0
);
create index if not exists kumeel_submissions_owner on public.kumeel_submissions(author_id,updated_at desc);
create index if not exists kumeel_submissions_queue on public.kumeel_submissions(status,updated_at);
create index if not exists kumeel_comments_owner on public.kumeel_community_comments(author_id,created_at desc);
create index if not exists kumeel_comments_queue on public.kumeel_community_comments(status,created_at);
create index if not exists kumeel_public_comments_post on public.kumeel_public_comments(post_id,published_at);
create index if not exists kumeel_posts_date on public.kumeel_community_posts(published_at desc);
alter table public.kumeel_submissions enable row level security;
alter table public.kumeel_community_posts enable row level security;
alter table public.kumeel_community_comments enable row level security;
alter table public.kumeel_public_comments enable row level security;
alter table public.kumeel_review_log enable row level security;
alter table kumeel_private.community_quota enable row level security;
revoke all on public.kumeel_submissions,public.kumeel_community_posts,public.kumeel_community_comments,public.kumeel_public_comments,public.kumeel_review_log from public,anon,authenticated;
revoke all on kumeel_private.community_quota from public,anon,authenticated;
grant select on public.kumeel_submissions,public.kumeel_community_comments,public.kumeel_review_log to authenticated;
grant select on public.kumeel_community_posts,public.kumeel_public_comments to anon,authenticated;
drop policy if exists community_private_submissions on public.kumeel_submissions;
create policy community_private_submissions on public.kumeel_submissions for select to authenticated
 using (author_id=(select auth.uid()) or (select public.kumeel_is_secure_editor()));
drop policy if exists community_private_comments on public.kumeel_community_comments;
create policy community_private_comments on public.kumeel_community_comments for select to authenticated
 using (author_id=(select auth.uid()) or (select public.kumeel_is_secure_editor()));
drop policy if exists community_public_posts on public.kumeel_community_posts;
create policy community_public_posts on public.kumeel_community_posts for select to anon,authenticated using(true);
drop policy if exists community_public_comments on public.kumeel_public_comments;
create policy community_public_comments on public.kumeel_public_comments for select to anon,authenticated using(true);
drop policy if exists community_admin_log on public.kumeel_review_log;
create policy community_admin_log on public.kumeel_review_log for select to authenticated using((select public.kumeel_is_secure_editor()));

-- All mutations are atomic RPCs: clients cannot set author, status or public snapshots.
create or replace function kumeel_private.community_actor() returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then
  raise exception 'COMMUNITY_AUTH' using errcode='42501';
 end if;
 return actor;
end; $$;
create or replace function kumeel_private.community_limit(actor uuid,kind text) returns void
language plpgsql security definer set search_path='' as $$
declare q kumeel_private.community_quota;
begin
 insert into kumeel_private.community_quota(user_id) values(actor) on conflict do nothing;
 select * into q from kumeel_private.community_quota where user_id=actor for update;
 if q.day<>current_date then q.posts:=0;q.comments:=0;q.writes:=0; end if;
 if q.writes>=100 or (kind='post' and q.posts>=5) or (kind='comment' and q.comments>=20) then
  raise exception 'COMMUNITY_LIMIT' using errcode='P0001';
 end if;
 update kumeel_private.community_quota set day=current_date,posts=q.posts+(case when kind='post' then 1 else 0 end),
 comments=q.comments+(case when kind='comment' then 1 else 0 end),writes=q.writes+1 where user_id=actor;
end; $$;
revoke all on function kumeel_private.community_actor(),kumeel_private.community_limit(uuid,text) from public,anon,authenticated;

create or replace function public.kumeel_save_submission(p_id uuid,p_revision integer,p_name text,p_title text,p_body text,p_category text,p_sources text,p_assisted boolean,p_submit boolean,p_rights boolean)
returns public.kumeel_submissions language plpgsql security definer set search_path='' as $$
declare actor uuid:=kumeel_private.community_actor(); item public.kumeel_submissions;
begin
 if p_submit and (not coalesce(p_rights,false) or char_length(btrim(p_body))<80) then raise exception 'COMMUNITY_CONTENT'; end if;
 if p_id is null then
  perform kumeel_private.community_limit(actor,'post');
  insert into public.kumeel_submissions(author_id,author_name,title,body,category,sources,assisted,rights_confirmed,status)
  values(actor,btrim(p_name),btrim(p_title),p_body,p_category,p_sources,p_assisted,p_rights,case when p_submit then 'pending' else 'draft' end) returning * into item;
 else
  select * into item from public.kumeel_submissions where id=p_id and author_id=actor for update;
  if not found then raise exception 'COMMUNITY_FORBIDDEN' using errcode='42501'; end if;
  if item.revision is distinct from p_revision then raise exception 'COMMUNITY_CONFLICT'; end if;
  if item.status not in ('draft','changes_requested') then raise exception 'COMMUNITY_LOCKED'; end if;
  perform kumeel_private.community_limit(actor,'write');
  update public.kumeel_submissions set author_name=btrim(p_name),title=btrim(p_title),body=p_body,category=p_category,
   sources=p_sources,assisted=p_assisted,rights_confirmed=p_rights,status=case when p_submit then 'pending' else 'draft' end,
   revision=revision+1,updated_at=now() where id=p_id returning * into item;
 end if;
 return item;
end; $$;
create or replace function public.kumeel_send_comment(p_post uuid,p_name text,p_body text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=kumeel_private.community_actor(); result uuid;
begin
 perform 1 from public.kumeel_community_posts where id=p_post for key share;
 if not found then raise exception 'COMMUNITY_NOT_PUBLISHED'; end if;
 perform kumeel_private.community_limit(actor,'comment');
 insert into public.kumeel_community_comments(post_id,author_id,author_name,body) values(p_post,actor,btrim(p_name),btrim(p_body)) returning id into result;
 return result;
end; $$;
create or replace function public.kumeel_review_community(p_kind text,p_id uuid,p_revision integer,p_decision text,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=kumeel_private.community_actor(); item public.kumeel_submissions; reply public.kumeel_community_comments;
begin
 if not public.kumeel_is_secure_editor() then raise exception 'COMMUNITY_FORBIDDEN' using errcode='42501'; end if;
 if p_decision is null or p_decision not in ('published','changes_requested','rejected') or p_note is null or char_length(p_note)>1000 then raise exception 'COMMUNITY_CONTENT'; end if;
 if p_decision<>'published' and char_length(btrim(p_note))<3 then raise exception 'COMMUNITY_NOTE_REQUIRED'; end if;
 if p_kind='post' then
  select * into item from public.kumeel_submissions where id=p_id for update;
  if not found then raise exception 'COMMUNITY_NOT_FOUND'; end if;
  if item.revision is distinct from p_revision then raise exception 'COMMUNITY_CONFLICT'; end if;
  if item.status not in ('pending','published') or (p_decision='published' and item.status<>'pending') then raise exception 'COMMUNITY_LOCKED'; end if;
  if p_decision='published' then
   if not item.rights_confirmed or char_length(btrim(item.body))<80 then raise exception 'COMMUNITY_CONTENT'; end if;
   insert into public.kumeel_community_posts(id,author_name,title,body,category,sources,assisted)
    values(item.id,item.author_name,item.title,item.body,item.category,item.sources,item.assisted);
  else
   delete from public.kumeel_community_posts where id=p_id;
   -- Removing a post hides its comments; they must be reviewed again after republication.
   update public.kumeel_community_comments set status='pending',revision=revision+1 where post_id=p_id and status='published';
  end if;
  update public.kumeel_submissions set status=p_decision,review_note=btrim(p_note),revision=revision+1,updated_at=now() where id=p_id;
 elsif p_kind='comment' then
  if p_decision='changes_requested' then raise exception 'COMMUNITY_CONTENT'; end if;
  -- Lock the parent before the comment to serialize moderation with post withdrawal.
  select s.* into item from public.kumeel_submissions s join public.kumeel_community_comments c on c.post_id=s.id where c.id=p_id for update of s;
  select * into reply from public.kumeel_community_comments where id=p_id for update;
  if not found then raise exception 'COMMUNITY_NOT_FOUND'; end if;
  if reply.revision is distinct from p_revision then raise exception 'COMMUNITY_CONFLICT'; end if;
  if reply.status not in ('pending','published') or (p_decision='published' and reply.status<>'pending') then raise exception 'COMMUNITY_LOCKED'; end if;
  if p_decision='published' then
   if item.status<>'published' then raise exception 'COMMUNITY_NOT_PUBLISHED'; end if;
   insert into public.kumeel_public_comments(id,post_id,author_name,body) values(reply.id,reply.post_id,reply.author_name,reply.body);
  else delete from public.kumeel_public_comments where id=p_id; end if;
  update public.kumeel_community_comments set status=p_decision,revision=revision+1 where id=p_id;
 else raise exception 'COMMUNITY_CONTENT'; end if;
 insert into public.kumeel_review_log(item_id,item_kind,reviewer_id,decision,note,revision) values(p_id,p_kind,actor,p_decision,btrim(p_note),p_revision);
end; $$;
revoke all on function public.kumeel_save_submission(uuid,integer,text,text,text,text,text,boolean,boolean,boolean),public.kumeel_send_comment(uuid,text,text),public.kumeel_review_community(text,uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.kumeel_save_submission(uuid,integer,text,text,text,text,text,boolean,boolean,boolean),public.kumeel_send_comment(uuid,text,text),public.kumeel_review_community(text,uuid,integer,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
