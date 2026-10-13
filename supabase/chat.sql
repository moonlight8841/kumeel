-- Kumeel: rate limits for the public reader chat ("اسأل كتابات كميل").
-- Run on jigypvbqiuakdatkzoul in the Supabase SQL editor. Transactional and repeatable.
--
-- Design
-- * Visitors are identified by an HMAC of their IP computed on the server; raw IPs never reach the database.
-- * public.kumeel_chat_take is callable with the publishable key, but only succeeds with the
--   server secret (CHAT_RATE_SECRET in Vercel). Its SHA-256 is stored here, never the secret itself,
--   so nobody can drain the shared quota by calling the database directly.
-- * A global daily cap protects the free Gemini quota even if many visitors arrive at once.
-- * No chat messages are stored. Only counters.
begin;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists kumeel_private;
revoke all on schema kumeel_private from public, anon, authenticated;

create table if not exists kumeel_private.chat_settings (
 id smallint primary key default 1 check (id = 1),
 secret_hash text not null check (secret_hash ~ '^[0-9a-f]{64}$'),
 per_minute integer not null default 4 check (per_minute between 1 and 60),
 per_day integer not null default 30 check (per_day between 1 and 1000),
 global_per_day integer not null default 400 check (global_per_day between 1 and 100000),
 enabled boolean not null default true
);
create table if not exists kumeel_private.chat_quota (
 visitor text primary key check (visitor ~ '^[0-9a-f]{64}$'),
 day date not null default current_date,
 day_count integer not null default 0,
 window_start timestamptz not null default now(),
 window_count integer not null default 0
);
create table if not exists kumeel_private.chat_usage (
 day date primary key,
 count integer not null default 0
);
alter table kumeel_private.chat_settings enable row level security;
alter table kumeel_private.chat_quota enable row level security;
alter table kumeel_private.chat_usage enable row level security;
revoke all on kumeel_private.chat_settings, kumeel_private.chat_quota, kumeel_private.chat_usage from public, anon, authenticated;

-- Returns 'ok', 'minute', 'day', 'global' or 'disabled'. Raises CHAT_FORBIDDEN for a wrong
-- secret and CHAT_NOT_CONFIGURED before the secret is set.
create or replace function public.kumeel_chat_take(p_secret text, p_visitor text) returns text
language plpgsql security definer set search_path = '' as $$
declare
 s kumeel_private.chat_settings;
 q kumeel_private.chat_quota;
 used integer;
begin
 select * into s from kumeel_private.chat_settings where id = 1;
 if not found then raise exception 'CHAT_NOT_CONFIGURED' using errcode = 'P0001'; end if;
 if p_secret is null or encode(extensions.digest(p_secret, 'sha256'), 'hex') <> s.secret_hash then
  raise exception 'CHAT_FORBIDDEN' using errcode = '42501';
 end if;
 if not s.enabled then return 'disabled'; end if;
 if p_visitor is null or p_visitor !~ '^[0-9a-f]{64}$' then raise exception 'CHAT_BAD_VISITOR' using errcode = '22023'; end if;

 -- Global cap first so a burst cannot exceed the provider quota.
 insert into kumeel_private.chat_usage(day) values (current_date) on conflict do nothing;
 select count into used from kumeel_private.chat_usage where day = current_date for update;
 if used >= s.global_per_day then return 'global'; end if;

 insert into kumeel_private.chat_quota(visitor) values (p_visitor) on conflict do nothing;
 select * into q from kumeel_private.chat_quota where visitor = p_visitor for update;
 if q.day <> current_date then q.day_count := 0; end if;
 if now() - q.window_start >= interval '1 minute' then q.window_start := now(); q.window_count := 0; end if;
 if q.day_count >= s.per_day then return 'day'; end if;
 if q.window_count >= s.per_minute then return 'minute'; end if;

 update kumeel_private.chat_quota
  set day = current_date, day_count = q.day_count + 1, window_start = q.window_start, window_count = q.window_count + 1
  where visitor = p_visitor;
 update kumeel_private.chat_usage set count = used + 1 where day = current_date;
 -- Keep only recent counters.
 if used = 0 then
  delete from kumeel_private.chat_quota where day < current_date - 2;
  delete from kumeel_private.chat_usage where day < current_date - 30;
 end if;
 return 'ok';
end; $$;

revoke all on function public.kumeel_chat_take(text, text) from public, anon, authenticated;
grant execute on function public.kumeel_chat_take(text, text) to anon, authenticated;
commit;

-- ---------------------------------------------------------------------------
-- One-time step (run separately, AFTER the block above).
-- 1. Generate a long random secret (e.g. 48+ characters) and add it in Vercel as
--    CHAT_RATE_SECRET (Production and Preview).
-- 2. Replace the placeholder below with that same secret and run:
--
-- insert into kumeel_private.chat_settings(id, secret_hash)
-- values (1, encode(extensions.digest('PUT-THE-SAME-SECRET-HERE', 'sha256'), 'hex'))
-- on conflict (id) do update set secret_hash = excluded.secret_hash;
--
-- Adjust limits any time, e.g.:
-- update kumeel_private.chat_settings set per_day = 20, global_per_day = 300 where id = 1;
-- Pause the chat without deploying:
-- update kumeel_private.chat_settings set enabled = false where id = 1;
-- ---------------------------------------------------------------------------
