-- Hosted-safe audit: no fixtures, no publication updates, always rolls back.
begin;
set local statement_timeout = '15s';
do $$
begin
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname like 'kumeel_%' and c.relkind='r' and not c.relrowsecurity)
 then raise exception 'RLS missing'; end if;
 if exists(select 1 from pg_policies where policyname='kumeel_active_session' and permissive<>'RESTRICTIVE')
 then raise exception 'Session policy must be restrictive'; end if;
 if has_schema_privilege('anon','kumeel_private','USAGE') or has_schema_privilege('authenticated','kumeel_private','USAGE')
 then raise exception 'Private schema exposed'; end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','kumeel_private') and p.proname like 'kumeel_%'
  and p.prosecdef and not coalesce(p.proconfig @> array['search_path=""'],false))
 then raise exception 'Unsafe definer search path'; end if;
end $$;
set local role anon;
do $$
begin
 perform count(*) from public.kumeel_published;
 begin
  perform 1 from public.kumeel_drafts;
  raise exception 'Anonymous can read drafts';
 exception when insufficient_privilege then null; end;
 begin
  perform public.kumeel_chat_take('invalid-audit-secret',repeat('0',64));
  raise exception 'Chat accepted invalid secret';
 exception when insufficient_privilege then null; end;
 begin
  perform public.kumeel_owner_ai_take('invalid-audit-secret',gen_random_uuid(),'invalid');
  raise exception 'Owner quota accepted invalid secret';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000000","session_id":"00000000-0000-0000-0000-000000000000","aal":"aal1"}',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
set local role authenticated;
do $$
begin
 if public.kumeel_has_active_session() or public.kumeel_is_secure_editor()
 then raise exception 'Invalid session authorized'; end if;
 if exists(select 1 from public.kumeel_submissions) or exists(select 1 from public.kumeel_drafts)
 then raise exception 'Invalid session can read private records'; end if;
 begin
  perform public.kumeel_send_comment(gen_random_uuid(),'Audit','Audit should be rejected');
  raise exception 'Invalid session can submit comment';
 exception when insufficient_privilege then null; end;
 begin
  perform public.kumeel_delete_sparring(gen_random_uuid());
  raise exception 'Invalid session can delete sparring';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: RLS, private schema, definer search paths, anonymous read restrictions, server secret checks, invalid-session denial' as result;
