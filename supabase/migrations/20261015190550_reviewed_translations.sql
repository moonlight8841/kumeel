begin;
create function public.kumeel_valid_public_translations(document jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare k text; r jsonb; w jsonb; bytes bytea; expected text;
begin
 if jsonb_typeof(document) is distinct from 'object' or document ? 'translationDrafts' then return false; end if;
 if not document ? 'translations' then return true; end if;
 if jsonb_typeof(document->'translations') is distinct from 'object' then return false; end if;
 if jsonb_typeof(document->'writings') is distinct from 'array' then return false; end if;
 if (select count(*) from jsonb_object_keys(document->'translations'))>501 then return false; end if;
 for k,r in select * from jsonb_each(document->'translations') loop
  if jsonb_typeof(r) is distinct from 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(r))<>4 or not r ?& array['locale','title','text','sourceHash'] then return false; end if;
  if r->>'locale' is distinct from 'en' or jsonb_typeof(r->'title') is distinct from 'string'
   or jsonb_typeof(r->'text') is distinct from 'string' or jsonb_typeof(r->'sourceHash') is distinct from 'string'
   or length(r->>'title')>300 or length(r->>'text')>60000 or length(btrim(r->>'text'))=0
   or r->>'sourceHash' !~ '^[0-9a-f]{64}$' then return false; end if;
  if k='bio' then
   if jsonb_typeof(document->'bio') is distinct from 'string' then return false;end if;
   bytes:=convert_to(E'kumeel-translation-v1\nbio\n'||(document->>'bio'),'UTF8');
  elsif left(k,8)='writing:' and length(k) between 9 and 158 then
   if length(btrim(r->>'title'))=0 then return false;end if;
   select item into w from jsonb_array_elements(document->'writings') item where item->>'id'=substr(k,9);
   if w is null or jsonb_typeof(w->'title') is distinct from 'string' or jsonb_typeof(w->'text') is distinct from 'string' then return false;end if;
   if coalesce(w->>'format','plain') not in ('plain','markdown') then return false;end if;
   bytes:=convert_to(E'kumeel-translation-v1\nwriting\n'||(w->>'title'),'UTF8')||decode('00','hex')
    ||convert_to(w->>'text','UTF8')||decode('00','hex')||convert_to(coalesce(w->>'format','plain'),'UTF8');
  else return false; end if;
  expected:=encode(extensions.digest(bytes,'sha256'),'hex');
  if r->>'sourceHash' is distinct from expected then return false;end if;
 end loop;
 return true;
end $$;
revoke all on function public.kumeel_valid_public_translations(jsonb) from public,anon,authenticated;
grant execute on function public.kumeel_valid_public_translations(jsonb) to authenticated;
alter table public.kumeel_published add constraint kumeel_published_reviewed_translations
 check(public.kumeel_valid_public_translations(content));
commit;
