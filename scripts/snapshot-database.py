"""Capture application schema metadata only; no table contents or credentials."""
import json
from pathlib import Path
from importlib.util import module_from_spec, spec_from_file_location

spec = spec_from_file_location('admin', 'scripts/supabase-admin.py')
admin = module_from_spec(spec)
spec.loader.exec_module(admin)
sql = """
select jsonb_build_object(
 'tables',(select jsonb_agg(to_jsonb(t)) from (select table_schema,table_name,column_name,ordinal_position,udt_schema,udt_name,is_nullable,column_default,is_identity,is_generated from information_schema.columns where table_schema in ('public','kumeel_private') order by table_schema,table_name,ordinal_position) t),
 'constraints',(select jsonb_agg(to_jsonb(t)) from (select n.nspname,c.relname,k.conname,pg_get_constraintdef(k.oid,true) definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','kumeel_private')) t),
 'indexes',(select jsonb_agg(to_jsonb(t)) from (select * from pg_indexes where schemaname in ('public','kumeel_private')) t),
 'policies',(select jsonb_agg(to_jsonb(t)) from (select * from pg_policies where schemaname in ('public','kumeel_private')) t),
 'functions',(select jsonb_agg(to_jsonb(t)) from (select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) arguments,pg_get_functiondef(p.oid) definition,p.proacl::text acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','kumeel_private') and p.prokind='f') t),
 'triggers',(select jsonb_agg(to_jsonb(t)) from (select pg_get_triggerdef(t.oid,true) definition from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','kumeel_private') and not t.tgisinternal) t),
 'grants',(select jsonb_agg(to_jsonb(t)) from (select * from information_schema.role_table_grants where table_schema in ('public','kumeel_private')) t)
) snapshot
"""
if __name__ == '__main__':
    data = admin.query(sql, read_only=True)[0]['snapshot']
    path = Path('supabase/schema-snapshot.json')
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'snapshot_written': True, 'contains_table_data': False, 'sections': list(data)}))
