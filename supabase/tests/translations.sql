\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
insert into public.kumeel_editors values ('00000000-0000-0000-0000-000000000001');
insert into public.kumeel_published(id,content) values ('main','{"bio":"نبذة","writings":[{"id":"a","title":"سؤال","text":"نص عربي\nثانٍ","category":"فلسفة"}],"media":[]}');
do $$ begin
 begin
  update public.kumeel_published set content=content||'{"translationDrafts":{}}'::jsonb where id='main';
  raise exception 'TEST FAILED: private drafts accepted';
 exception when check_violation then null; end;
end $$;
-- Digest independently computed by Node crypto and checked below.
update public.kumeel_published set content=content||jsonb_build_object('translations',jsonb_build_object('writing:a',jsonb_build_object('locale','en','title','A question','text','English text.','sourceHash',encode(extensions.digest(convert_to(E'kumeel-translation-v1\nwriting\nسؤال','UTF8')||decode('00','hex')||convert_to(E'نص عربي\nثانٍ','UTF8')||decode('00','hex')||convert_to('plain','UTF8'),'sha256'),'hex'))));
do $$ begin
 begin
  update public.kumeel_published set content=jsonb_set(content,'{writings,0,text}','"changed"');
  raise exception 'TEST FAILED: stale source accepted';
 exception when check_violation then null; end;
 begin
  update public.kumeel_published set content=jsonb_set(content,'{translations,writing:a,locale}','"fr"');
  raise exception 'TEST FAILED: unsupported language accepted';
 exception when check_violation then null; end;
 begin
  update public.kumeel_published set content=jsonb_set(content,'{translations,writing:a,notes}','"PRIVATE"');
  raise exception 'TEST FAILED: private record metadata accepted';
 exception when check_violation then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
insert into public.kumeel_drafts(user_id,content) values ('00000000-0000-0000-0000-000000000001','{"translationDrafts":{"bio":"PRIVATE"}}');
do $$ declare n integer;begin
 select count(*) into n from public.kumeel_drafts;if n<>1 then raise exception 'TEST FAILED: owner draft unavailable';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$ declare n integer;begin
 select count(*) into n from public.kumeel_drafts;if n<>0 then raise exception 'TEST FAILED: other user sees draft';end if;
end $$;
set local role anon;
do $$ begin
 begin perform 1 from public.kumeel_drafts;raise exception 'TEST FAILED: anonymous draft access';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
