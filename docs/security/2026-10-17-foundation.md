# Security, privacy and delivery foundation

Scope: Kumeel's current React, Cloudflare Worker, Vercel API adapters and Supabase project `jigypvbqiuakdatkzoul`. The two approved owners remain authorized. MFA remains optional, as requested on 2026-10-17. No new external service, paid resource or authentication provider is introduced.

## Boundaries and acceptance criteria

1. Auth verifies identity; the database is the authority for owner access. A signed-out or expired session must no longer authorize database owner actions or owner AI endpoints, even while its access token has not expired. Keep the existing confirmed-email and explicit-owner restrictions. Do not grant roles from user-editable metadata.
2. Local editorial drafts must not replace published pages or be restored for a different signed-in user. New drafts live in tab session storage under the verified user ID. Preserve the legacy draft without silently adopting it: an authorized owner can explicitly import it. Signing out clears the active owner's tab copy and in-memory editorial state. Cloud drafts remain private per owner.
3. Auth failures never report a successful email request. Distinguish email-provider quota, request throttling, CAPTCHA and network errors with fixed non-enumerating messages. The local cooldown is a UX aid, persists across reloads, and never replaces Supabase Auth's server limits. Do not change SMTP, CAPTCHA or Auth limits without a supported management connection.
4. Owner AI cooldowns and daily budgets are atomic database counters shared across Worker instances. Reuse the already configured server-side rate secret, validate actor/scope, store counters only, fail closed on quota errors, and return accurate `Retry-After`. Public chat retains its separate shared quota and HMAC visitor keys.
5. Cache only normalized published content. Revalidate its revision before reuse, coalesce concurrent reads, bound retained snapshots, isolate callers from mutation, and bypass the cache for admin content. Do not cache AI conversations, private drafts, auth pages or failed reads. Never cache a fallback publication or resurrect bundled articles on a failed public read. Keep HTTP HTML responses `no-store` until a coherent cross-edge purge strategy exists.
6. Count actual UTF-8 body bytes at API boundaries, not only the optional Content-Length header. Keep trusted proxy handling at the deployment adapter, not in application authorization.
7. Explain local and third-party data handling in the product. Let a reader explicitly clear chat/question data. Offer optional Authenticator setup without gating existing owner access.

## Delivery sequence

- Reproduce auth feedback, cache coherence, draft isolation and authorization/quota failures with regression tests.
- Add shared modules with narrow inputs, then integrate the existing adapters and components.
- Back up the live database, run the additive SQL and role/concurrency checks, preserving owners and optional MFA.
- Run lint/build/application/DB tests and production-dependency audit; publish and verify actual runtime and API behavior.

## Limits and follow-up

Browser Supabase sessions still use tab sessionStorage. This is not an HttpOnly-cookie BFF; a complete move requires changing every authenticated database/storage consumer, CSRF handling, refresh rotation and email callbacks together. Do not claim that XSS-resistant server sessions have been delivered by changing a storage flag. Provider-side Auth email limits and SMTP remain external configuration. No claim of legal privacy compliance or a complete security certification is made.

## Verified delivery — 2026-10-17

Apply `supabase/security-foundation.sql` **last**, after community, chat, dialogue and teachers setup. Reapply it after any older setup script that replaces authorization functions. The live migration committed successfully after a private schema/data backup. Both approved owners have confirmed emails and editor membership. MFA is optional; the separate `harden-auth.sql` is an explicit future enforcement option and was not applied.

Owner budgets are per owner and tool: assist 8-second cooldown / 120 requests per day; idea 30-second cooldown / 30 requests per day. Owner daily budgets reset at midnight Asia/Riyadh. Public chat retains its existing independent limits and UTC day calculation. A quota admission counts an attempt even when the downstream AI provider subsequently fails.

Validation passed: lint, TypeScript/client/SSR build, application regressions, release checks, Worker deployment dry run, and zero reported production dependency vulnerabilities. Isolated PostgreSQL tests covered repeatable migrations, both owners, confirmed email, revoked/expired sessions, private reads/writes, 12 concurrent connections, quota budgets, denied-call accounting and secret isolation. The narrow rollback was rehearsed against PostgreSQL. Browser fixtures covered explicit legacy import, owner draft/notebook isolation, logout cleanup and mail-quota feedback surviving reload; these were mocked local Auth fixtures, not a claim of interactive live owner login.

Live tests used a disposable ordinary account, with no email delivery: a real Auth session was accepted, owner authorization was denied, and the same unexpired JWT lost database session authorization immediately after logout. The temporary account was deleted. Live rollback-only quota checks admitted one request and denied its repeat; the transaction was rolled back. Private counter access is denied to anonymous callers. Supabase's default email redirect and admin/reset redirect targets now resolve to the canonical domain. Provider email delivery quotas and SMTP were not changed.

Recovery artifacts are private and ignored under `artifacts/security-release/`: `before.dump`, original function definitions and `rollback.sql`. Roll back Worker code and the narrow authorization definitions together if needed; do not restore the entire database over newer content. Previous Worker version: `d70f9636-c47e-4914-8acc-001960ecf090`. Legacy browser drafts remain until explicit deletion; cloud drafts remain available subject to owner authorization. Public reading preferences/exercise records retain their existing device storage behavior.
