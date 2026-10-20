-- Unused by the API; keep it callable only by privileged server roles.
revoke execute on function public.kumeel_owner_ai_take(text, uuid, text) from public, anon, authenticated;
