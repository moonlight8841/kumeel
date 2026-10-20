begin;
set local statement_timeout='15s';
select set_config('kumeel.audit_actor',(select e.user_id::text from public.kumeel_editors e join auth.users u on u.id=e.user_id where u.email_confirmed_at is not null and lower(u.email) in ('komeil9060@gmail.com','bobmorgann2@gmail.com') limit 1),true);
select set_config('kumeel.audit_session',gen_random_uuid()::text,true);
insert into auth.sessions(id,user_id,aal,created_at,updated_at)
 values(current_setting('kumeel.audit_session')::uuid,current_setting('kumeel.audit_actor')::uuid,'aal2',now(),now());
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('kumeel.audit_actor'),'session_id',current_setting('kumeel.audit_session'),'aal','aal1','role','authenticated')::text,true);
select set_config('request.jwt.claim.sub',current_setting('kumeel.audit_actor'),true);
set local role authenticated;
do $$begin
 if public.kumeel_is_secure_editor() then raise exception 'AAL1 editor authorized';end if;
 begin
 insert into storage.objects(bucket_id,name) values('kumeel-books','books/'||current_setting('kumeel.audit_actor')||'/'||gen_random_uuid()||'.pdf');
 raise exception 'AAL1 upload accepted';
 exception when insufficient_privilege then null;end;
 begin
 insert into storage.objects(bucket_id,name) values('kumeel-media',gen_random_uuid()||'.png');
 raise exception 'AAL1 media upload accepted';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('kumeel.audit_actor'),'session_id',current_setting('kumeel.audit_session'),'aal','aal2','role','authenticated')::text,true);
set local role authenticated;
do $$begin
 if not public.kumeel_is_secure_editor() then raise exception 'Valid MFA editor denied';end if;
 insert into storage.objects(bucket_id,name) values('kumeel-books','books/'||current_setting('kumeel.audit_actor')||'/'||gen_random_uuid()||'.pdf');
 begin
 insert into storage.objects(bucket_id,name) values('kumeel-books','books/'||gen_random_uuid()||'/'||gen_random_uuid()||'.pdf');
 raise exception 'Another user folder accepted';
 exception when insufficient_privilege then null;end;
 begin
 insert into storage.objects(bucket_id,name) values('kumeel-books','books/'||current_setting('kumeel.audit_actor')||'/'||gen_random_uuid()||'.html');
 raise exception 'Non-PDF path accepted';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
delete from auth.sessions where id=current_setting('kumeel.audit_session')::uuid;
set local role authenticated;
do $$begin
 if public.kumeel_is_secure_editor() then raise exception 'Revoked session authorized';end if;
 begin
 insert into storage.objects(bucket_id,name) values('kumeel-books','books/'||current_setting('kumeel.audit_actor')||'/'||gen_random_uuid()||'.pdf');
 raise exception 'Revoked session upload accepted';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: MFA required, editor PDF upload allowed, other folders and file suffixes denied, revoked sessions denied; all synthetic metadata rolled back' result;
