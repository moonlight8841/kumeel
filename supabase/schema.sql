-- Applied using the Management API; the server-generated migration is archived below.
create table public.kumeel_editors (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.kumeel_editors enable row level security;
revoke all on public.kumeel_editors from anon, authenticated;
grant select on public.kumeel_editors to authenticated;
create policy "Editors see their own membership" on public.kumeel_editors
  for select to authenticated using (user_id = (select auth.uid()));

create table public.kumeel_published (
  id text primary key check (id = 'main'),
  content jsonb not null check (
    jsonb_typeof(content) = 'object' and
    jsonb_typeof(content->'bio') = 'string' and
    jsonb_typeof(content->'writings') = 'array' and
    jsonb_typeof(content->'media') = 'array' and
    octet_length(content::text) <= 4000000
  ),
  revision integer not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.kumeel_published enable row level security;
revoke all on public.kumeel_published from anon, authenticated;
grant select on public.kumeel_published to anon, authenticated;
grant update(content) on public.kumeel_published to authenticated;
create policy "Public reads published content" on public.kumeel_published
  for select to anon, authenticated using (true);
create policy "Only editors publish" on public.kumeel_published
  for update to authenticated
  using (exists(select 1 from public.kumeel_editors where user_id = (select auth.uid())))
  with check (exists(select 1 from public.kumeel_editors where user_id = (select auth.uid())));

create table public.kumeel_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  content jsonb not null check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 4000000),
  updated_at timestamptz not null default now()
);
alter table public.kumeel_drafts enable row level security;
revoke all on public.kumeel_drafts from anon, authenticated;
grant select,insert,update,delete on public.kumeel_drafts to authenticated;
create policy "Editors manage only their own drafts" on public.kumeel_drafts
  for all to authenticated
  using (user_id = (select auth.uid()) and exists(select 1 from public.kumeel_editors where user_id = (select auth.uid())))
  with check (user_id = (select auth.uid()) and exists(select 1 from public.kumeel_editors where user_id = (select auth.uid())));

create function public.kumeel_touch_content() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_table_name = 'kumeel_published' then
    new.revision := old.revision + 1;
  end if;
  return new;
end;
$$;
revoke all on function public.kumeel_touch_content() from public, anon, authenticated;
create trigger kumeel_published_updated before update on public.kumeel_published
for each row execute function public.kumeel_touch_content();
create trigger kumeel_drafts_updated before update on public.kumeel_drafts
for each row execute function public.kumeel_touch_content();

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('kumeel-media','kumeel-media',true,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']);
create policy "Kumeel editors upload media" on storage.objects
for insert to authenticated with check (bucket_id = 'kumeel-media' and exists(select 1 from public.kumeel_editors where user_id = (select auth.uid())));
create policy "Kumeel editors inspect media" on storage.objects
for select to authenticated using (bucket_id = 'kumeel-media' and exists(select 1 from public.kumeel_editors where user_id = (select auth.uid())));
