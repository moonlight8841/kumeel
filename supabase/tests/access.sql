begin;
select set_config('kumeel.test_owner', gen_random_uuid()::text, true);
select set_config('kumeel.test_other', gen_random_uuid()::text, true);
insert into auth.users(id) values (current_setting('kumeel.test_owner')::uuid), (current_setting('kumeel.test_other')::uuid);
insert into public.kumeel_editors(user_id) values (current_setting('kumeel.test_owner')::uuid);

set local role anon;
do $$ begin
  if (select count(*) from public.kumeel_published) <> 1 then raise exception 'Public content missing'; end if;
  begin
    perform * from public.kumeel_drafts;
    raise exception 'Anonymous can read drafts';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.kumeel_published set content = content where id = 'main';
    raise exception 'Anonymous can publish';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select set_config('request.jwt.claim.sub', current_setting('kumeel.test_other'), true);
set local role authenticated;
do $$ declare n integer; begin
  if exists(select 1 from public.kumeel_editors) then raise exception 'Other user sees editor membership'; end if;
  update public.kumeel_published set content = content where id = 'main';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Other user can publish'; end if;
  begin
    insert into public.kumeel_drafts(user_id,content) values ((select auth.uid()), '{}'::jsonb);
    raise exception 'Other user can save draft';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects(bucket_id,name) values ('kumeel-media','test-denied.png');
    raise exception 'Other user can upload media';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select set_config('request.jwt.claim.sub', current_setting('kumeel.test_owner'), true);
set local role authenticated;
do $$ declare before_revision integer; after_revision integer; n integer; begin
  if (select count(*) from public.kumeel_editors) <> 1 then raise exception 'Owner missing membership'; end if;
  select revision into before_revision from public.kumeel_published where id='main';
  update public.kumeel_published set content=content where id='main' and revision=before_revision returning revision into after_revision;
  if after_revision <> before_revision + 1 then raise exception 'Revision did not increment'; end if;
  update public.kumeel_published set content=content where id='main' and revision=before_revision;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Stale revision overwrote publication'; end if;
  insert into public.kumeel_drafts(user_id,content) values ((select auth.uid()),'{"bio":"private"}');
  update public.kumeel_drafts set content='{"bio":"saved"}' where user_id=(select auth.uid());
  if (select content->>'bio' from public.kumeel_drafts where user_id=(select auth.uid())) <> 'saved' then raise exception 'Draft did not update'; end if;
  insert into storage.objects(bucket_id,name) values ('kumeel-media','test-allowed.png');
end $$;
reset role;
select set_config('request.jwt.claim.sub', current_setting('kumeel.test_other'), true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.kumeel_drafts) then raise exception 'Other user sees owner draft'; end if;
end $$;
reset role;
rollback;
select 'PASS: public read, anonymous deny, non-owner deny, owner draft and publish, media permissions, optimistic concurrency' as result;
