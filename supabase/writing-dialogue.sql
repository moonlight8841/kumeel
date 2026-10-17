-- Kumeel: reader opinions on owner writings and the owner's private sparring sessions.
-- Additive; run after community.sql on jigypvbqiuakdatkzoul. Transactional and repeatable.
begin;
create table if not exists public.kumeel_writing_responses (
 id uuid primary key default gen_random_uuid(),
 writing_id text not null check(char_length(writing_id) between 1 and 150),
 author_id uuid not null references auth.users(id),
 author_name text not null check(char_length(btrim(author_name)) between 2 and 60),
 body text not null check(char_length(btrim(body)) between 10 and 2000),
 status text not null default 'pending' check(status in ('pending','published','rejected')),
 revision integer not null default 1, created_at timestamptz not null default now()
);
create table if not exists public.kumeel_public_writing_responses (
 id uuid primary key references public.kumeel_writing_responses(id),
 writing_id text not null, author_name text not null, body text not null, published_at timestamptz not null default now()
);
create table if not exists public.kumeel_sparring (
 id uuid primary key default gen_random_uuid(),
 writing_id text not null check(char_length(writing_id) between 1 and 150),
 style text not null check(style in ('logic','history','skeptic')),
 turns jsonb not null default '[]'::jsonb,
 revision integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists kumeel_writing_responses_owner on public.kumeel_writing_responses(author_id,writing_id,created_at desc);
create index if not exists kumeel_writing_responses_queue on public.kumeel_writing_responses(status,created_at);
create index if not exists kumeel_public_writing_responses_writing on public.kumeel_public_writing_responses(writing_id,published_at);
create index if not exists kumeel_sparring_writing on public.kumeel_sparring(writing_id,updated_at desc);
alter table public.kumeel_writing_responses enable row level security;
alter table public.kumeel_public_writing_responses enable row level security;
alter table public.kumeel_sparring enable row level security;
revoke all on public.kumeel_writing_responses,public.kumeel_public_writing_responses,public.kumeel_sparring from public,anon,authenticated;
grant select on public.kumeel_writing_responses,public.kumeel_sparring to authenticated;
grant select on public.kumeel_public_writing_responses to anon,authenticated;
drop policy if exists writing_responses_private on public.kumeel_writing_responses;
create policy writing_responses_private on public.kumeel_writing_responses for select to authenticated
 using (author_id=(select auth.uid()) or (select public.kumeel_is_secure_editor()));
drop policy if exists writing_responses_public on public.kumeel_public_writing_responses;
create policy writing_responses_public on public.kumeel_public_writing_responses for select to anon,authenticated using(true);
drop policy if exists sparring_owner on public.kumeel_sparring;
create policy sparring_owner on public.kumeel_sparring for select to authenticated using((select public.kumeel_is_secure_editor()));

-- Turn shape is checked in the save RPC; nested CASE keeps array/object functions off the wrong type.
create or replace function kumeel_private.valid_sparring_turns(t jsonb) returns boolean
language sql immutable set search_path='' as $$
 select case when t is null or jsonb_typeof(t)<>'array' then false
 when jsonb_array_length(t)>40 then false
 else not exists(select 1 from jsonb_array_elements(t) e where
  case when jsonb_typeof(e)<>'object' then true
  else exists(select 1 from jsonb_object_keys(e) k where k not in ('role','text','quote'))
   or coalesce(e->>'role','') not in ('critic','owner')
   or case when jsonb_typeof(e->'text') is distinct from 'string' then true else char_length(e->>'text') not between 1 and 4000 end
   or case when not (e ? 'quote') then false when jsonb_typeof(e->'quote')<>'string' then true else char_length(e->>'quote')>500 end
  end)
 end
$$;
revoke all on function kumeel_private.valid_sparring_turns(jsonb) from public,anon,authenticated;

create or replace function public.kumeel_send_writing_response(p_writing text,p_name text,p_body text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=kumeel_private.community_actor(); result uuid;
begin
 -- Only writings in the public snapshot accept opinions; starter templates have no reader page.
 if p_writing is null or not exists(
  select 1 from public.kumeel_published p
  cross join lateral jsonb_array_elements(case when jsonb_typeof(p.content->'writings')='array' then p.content->'writings' else '[]'::jsonb end) w
  where p.id='main' and w->>'id'=p_writing) then
  raise exception 'COMMUNITY_NOT_PUBLISHED';
 end if;
 perform kumeel_private.community_limit(actor,'comment');
 insert into public.kumeel_writing_responses(writing_id,author_id,author_name,body) values(p_writing,actor,btrim(p_name),btrim(p_body)) returning id into result;
 return result;
end; $$;

create or replace function public.kumeel_review_writing_response(p_id uuid,p_revision integer,p_decision text,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=kumeel_private.community_actor(); reply public.kumeel_writing_responses;
begin
 if not public.kumeel_is_secure_editor() then raise exception 'COMMUNITY_FORBIDDEN' using errcode='42501'; end if;
 if p_decision is null or p_decision not in ('published','rejected') or p_note is null or char_length(p_note)>1000 then raise exception 'COMMUNITY_CONTENT'; end if;
 if p_decision='rejected' and char_length(btrim(p_note))<3 then raise exception 'COMMUNITY_NOTE_REQUIRED'; end if;
 select * into reply from public.kumeel_writing_responses where id=p_id for update;
 if not found then raise exception 'COMMUNITY_NOT_FOUND'; end if;
 if reply.revision is distinct from p_revision then raise exception 'COMMUNITY_CONFLICT'; end if;
 if reply.status not in ('pending','published') or (p_decision='published' and reply.status<>'pending') then raise exception 'COMMUNITY_LOCKED'; end if;
 if p_decision='published' then
  insert into public.kumeel_public_writing_responses(id,writing_id,author_name,body) values(reply.id,reply.writing_id,reply.author_name,reply.body);
 else delete from public.kumeel_public_writing_responses where id=p_id; end if;
 update public.kumeel_writing_responses set status=p_decision,revision=revision+1 where id=p_id;
 insert into public.kumeel_review_log(item_id,item_kind,reviewer_id,decision,note,revision) values(p_id,'writing_response',actor,p_decision,btrim(p_note),p_revision);
end; $$;

create or replace function public.kumeel_save_sparring(p_id uuid,p_revision integer,p_writing text,p_style text,p_turns jsonb)
returns public.kumeel_sparring language plpgsql security definer set search_path='' as $$
declare item public.kumeel_sparring;
begin
 if not public.kumeel_is_secure_editor() then raise exception 'COMMUNITY_FORBIDDEN' using errcode='42501'; end if;
 if not kumeel_private.valid_sparring_turns(p_turns) then raise exception 'COMMUNITY_CONTENT'; end if;
 if p_id is null then
  insert into public.kumeel_sparring(writing_id,style,turns) values(p_writing,p_style,p_turns) returning * into item;
 else
  select * into item from public.kumeel_sparring where id=p_id for update;
  if not found then raise exception 'COMMUNITY_NOT_FOUND'; end if;
  if item.revision is distinct from p_revision then raise exception 'COMMUNITY_CONFLICT'; end if;
  update public.kumeel_sparring set turns=p_turns,revision=revision+1,updated_at=now() where id=p_id returning * into item;
 end if;
 return item;
end; $$;

create or replace function public.kumeel_delete_sparring(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.kumeel_is_secure_editor() then raise exception 'COMMUNITY_FORBIDDEN' using errcode='42501'; end if;
 delete from public.kumeel_sparring where id=p_id;
end; $$;

revoke all on function public.kumeel_send_writing_response(text,text,text),public.kumeel_review_writing_response(uuid,integer,text,text),public.kumeel_save_sparring(uuid,integer,text,text,jsonb),public.kumeel_delete_sparring(uuid) from public,anon,authenticated;
grant execute on function public.kumeel_send_writing_response(text,text,text),public.kumeel_review_writing_response(uuid,integer,text,text),public.kumeel_save_sparring(uuid,integer,text,text,jsonb),public.kumeel_delete_sparring(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
