-- Requires separate release approval on a hosted environment. Preserves all rows.
begin;
alter table public.kumeel_published drop constraint kumeel_published_reviewed_translations;
drop function public.kumeel_valid_public_translations(jsonb);
commit;
