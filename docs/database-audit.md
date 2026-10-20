# Database audit and applied improvements

Audited 2026-10-19, project `jigypvbqiuakdatkzoul` (Postgres 17.11).

## Applied to the hosted database

Migration `20261019205051_database_relationship_indexes` adds:

| Index | Purpose |
| --- | --- |
| `kumeel_comments_post_status` | Covers comment parent FK and moderation's parent/status filter |
| `kumeel_review_log_reviewer` | Covers review log reviewer FK |
| `kumeel_owner_ai_quota_scope` | Covers quota scope FK; the actor/scope primary key does not cover scope alone |

Each affected table was only 32 KiB including indexes before the change. Atomic index creation used a 3-second lock timeout and 30-second statement timeout. No rows, roles, or policies were changed. No measured latency improvement is claimed for these currently small tables. The indexes protect relationship checks as data grows.

Supabase's performance advisor reported three unindexed foreign keys before and none after. It now reports four unused indexes, including the three new ones. They are retained because empty/new tables have no meaningful usage history and these indexes cover real constraints.

## Verification

`supabase/tests/hosted-security.sql` passed against the hosted project. It performs no fixture inserts or content updates and rolls back its transaction. It checks:

- RLS enabled on all Kumeel public tables; session policies restrictive.
- No client USAGE privilege on `kumeel_private`.
- Empty search paths on Kumeel SECURITY DEFINER functions.
- Anonymous public read works; private draft read is denied.
- Chat and owner AI quota functions reject invalid server secrets.
- Invalid-session editor checks, private reads, comment writes and sparring deletes are denied.

The independent frontend translation-hash contract query also passed. `npm run check:live` returned HTTP 200 for public content, teacher profiles, and community posts. These checks do not establish successful authenticated owner/member flows, every RPC branch, race behavior, load capacity, or disaster recovery.

## Remaining findings

Latest hardening: migration `20261019215252_secure_admin_pdf_uploads` now requires `aal2` in the hosted secure-editor helper and extends restrictive storage protection to both media and books. Per-user immutable PDF upload policies were added. Hosted SQL policy tests and a Storage HTTP fixture round-trip passed; the fixture was removed. See [PDF upload](pdf-upload.md). Earlier descriptions of MFA being disabled/prepared describe the state before this migration.

Follow-up: SMTP is now configured and read back successfully; see [account access](account-access.md). Enabling leaked-password protection returned HTTP 402 and remains unavailable on the current account configuration. MFA enforcement is prepared in local application code but has not been imposed on the hosted helper ahead of deployment. A metadata-only snapshot is saved in `supabase/schema-snapshot.json` by `python scripts/snapshot-database.py`; it includes columns, constraints, indexes, policies, functions, triggers and grants, but is not a tested restore baseline. Docker's local engine is not running, so fresh-database replay verification remains pending. Existing migration history was preserved.

- All 13 public tables have RLS. The six private tables deliberately have no client policies; they are accessed through controlled definer functions. Do not grant client access merely to clear the informational [RLS/no-policy finding](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- Two server-secret-protected quota RPCs remain callable with the public API key because current server code uses that key plus the separate secret. Eleven other privileged RPCs provide session, owner, and moderation checks. Negative tests passed for the sampled paths, but this is not a full security proof. Removing their execute privileges would require a coordinated API/Worker authentication migration. See [anonymous definer RPCs](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [authenticated definer RPCs](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- [Leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) is disabled. Auth configuration is separate from SQL migrations; no valid management credential has been verified in this session.
- Admin MFA is currently disabled in the application and live secure-editor helper; this was pre-existing and not changed. Re-enabling it requires verified owner enrollment to avoid locking out administration.
- Hosted migration history lists only the new migration, while this checkout contains earlier SQL and migrations. The project needs a reconciled baseline before assuming a fresh migration replay reproduces production. No history entries were fabricated or deleted during this audit.

For rollback of this migration, drop only the three named indexes during an appropriate maintenance window; this affects performance, not stored data. Existing indexes and constraint definitions remain intact.
