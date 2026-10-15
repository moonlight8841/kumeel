# Language and Reviewed Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Arabic/English public navigation and private, owner-reviewed English translations without exposing drafts or replacing Arabic originals.

**Architecture:** Keep existing Arabic URLs and add a small `/en/` public surface. Separate private translation drafts from the approved translation catalogue, and resolve freshness before rendering or indexing. Extend the existing owner-only editing assistant; enforce published-payload rules at the database boundary as well as in application code.

**Tech Stack:** Existing React 18, TypeScript, Vite, Cloudflare Worker, Supabase Postgres JSONB and Gemini. Native Web Crypto for SHA-256; no new runtime dependency required.

**Spec:** `docs/superpowers/specs/2026-10-15-language-translation-design.md` (approved by owner).

## Global Constraints

- Work only in `/home/bob/kumeel`; `/home/bob/rentit` is not the implementation target.
- Arabic is the original and default. Enable only `ar` and `en`.
- Public English scope: home, about, writing list and approved translated writing detail. Other sections stay Arabic and must be labelled accordingly.
- Translation is a private draft until explicitly reviewed and published by the owner. Never auto-publish a model response.
- Keep original Arabic URLs, content, chat and existing permissions intact. English views label chat as Arabic.
- No IP/browser-language redirects, fabricated profile data, paid-plan activation, bulk translation or public translation endpoint.
- Input text maximum: 12000 characters; never silently truncate input or translation output.
- Source changes make old translations unavailable publicly until reviewed again.
- Do not read `.env` wholesale, display credentials or copy production content for testing. Use synthetic fixtures.
- No live migration or deployment under this plan until separate owner approval after preview and verification.
- Preserve unrelated dirty files. A task commit may include only the task's new files or reviewed task-specific hunks; do not stage entire pre-existing dirty files.
- Execute inline unless the user explicitly selects delegation. Do not dispatch agents automatically.

## File and Contract Map

New focused modules:

- `src/lib/i18n.ts`: locale types, dictionaries, route resolution and supported-language metadata.
- `src/lib/source-hash.mjs`: browser/Worker-compatible source serialization and async SHA-256; companion declaration file for TypeScript.
- `src/lib/translations.ts`: translation types, validation, approval and current-source resolution.
- `src/lib/localized-content.ts`: async freshness resolution producing safe, synchronous render input.
- `src/components/LanguageSwitch.tsx`: accessible links and preference storage; never owns redirects.
- `src/components/EnglishPages.tsx`: the limited English public surface, not a clone of every Arabic component.
- `src/components/admin/AdminTranslations.tsx`: private translation editor and explicit review state.
- `scripts/test-i18n.mjs`, `scripts/test-translations.mjs`: real module/SSR tests following the existing Vite test harness.
- `supabase/tests/translations.sql`: synthetic rollback-only database boundary tests.

Extend existing `src/content.ts`, `src/lib/cloud.ts`, `src/lib/publication.ts`, `src/lib/content-scope.ts`, `src/lib/pages.ts`, `src/App.tsx`, `src/main.tsx`, `src/entry-server.tsx`, public header/footer, admin assistant, `api/edit-assist.mjs`, `worker/index.mjs`, `scripts/prerender.mjs`, API HTML/sitemap handlers, and existing test runners. Do not duplicate route or SEO rules in Worker and frontend.

### Shared data contracts

```ts
type Locale = 'ar' | 'en'
type TranslationKey = 'bio' | `writing:${string}`
type TranslationRecord = {
  locale: 'en'; title: string; text: string; sourceHash: string
}
type TranslationCatalogue = Partial<Record<TranslationKey, TranslationRecord>>
// Content.translations contains only explicitly approved entries.
// OwnerDraft.translationDrafts is private and never a Content field.
type OwnerDraft = Content & { translationDrafts?: TranslationCatalogue }
type ResolvedRoute = { locale: Locale; path: string; supported: boolean }
```

Source serialization is versioned and deterministic. Use `kumeel-translation-v1\nbio\n` + raw bio for a biography; for a writing use `kumeel-translation-v1\nwriting\n` + title + NUL + text + NUL + (`format` or `plain`). Reject NUL in these source fields when translations are enabled so framing cannot collide. Normalize neither whitespace nor Unicode; any editorial source change requires review. SQL must build exactly the same bytes using UTF-8 and pgcrypto. PostgreSQL text cannot contain NUL, so SQL constructs the digest bytea with `convert_to(...) || decode('00','hex')`, not a text NUL.

`sourceDigest(content, key): Promise<string>` returns lowercase 64-character hex. `resolvePublishedTranslations(content): Promise<Content>` returns a copy containing only valid, approved, current entries; it never changes Arabic source fields. Await it before SSR, sitemap/head generation, initial prerender and any browser-side published-content update. Do not invoke hashing inside a React render or use module-global request state.

---

### Task 1: Locale routes and dictionary

**Files:** Create `src/lib/i18n.ts`, `scripts/test-i18n.mjs`; integrate the script into `package.json` test chain.

**Interfaces:** `resolveLocalePath(pathname): ResolvedRoute`, `localePath(locale, arabicPath): string`, `messages[locale]`. Resolve only home/about/writings/detail for English; reject `/en/admin`, `/en/library` and duplicate prefixes.

- [ ] Add failing assertions using Vite `ssrLoadModule('/src/lib/i18n.ts')`:

```js
assert.deepEqual(resolveLocalePath('/en/about'),{locale:'en',path:'/about',supported:true})
assert.equal(resolveLocalePath('/en/admin').supported,false)
assert.equal(localePath('en','/'),'/en/')
assert.equal(localePath('ar','/writings/a'),'/writings/a')
assert.equal(resolveLocalePath('/en/en/about').supported,false)
```

- [ ] Run `node scripts/test-i18n.mjs`; observe missing route behavior fail.
- [ ] Implement those pure functions plus complete typed dictionaries for the English scope: navigation, footer, home, about, list/detail, empty/missing translation, language control and Arabic-chat disclosure. Unsupported locale input falls back to `ar`; unsupported English paths remain unsupported, not falsely mapped.
- [ ] Run the script and existing `node scripts/test-platform.mjs`; both must pass.
- [ ] Review and commit this deliverable only, excluding unrelated package edits.

### Task 2: Translation validation, hashing and approval model

**Files:** Create `src/lib/source-hash.mjs`, its `.d.mts`, `src/lib/translations.ts`, `src/lib/localized-content.ts`, `scripts/test-translations.mjs`; extend content validation without making private drafts valid public Content.

**Interfaces:** Contracts above; additionally `validTranslationCatalogue(value): boolean`, `validOwnerDraft(value): boolean`, `approveTranslation(draft, content, key): Promise<TranslationRecord>` and `publicPayload(draft): Promise<Content>`. The last function strips all `translationDrafts` and resolves current approved entries only.

- [ ] Add failing tests with two independent catalogues, one private and one approved:

```js
const writing={id:'a',title:'سؤال',text:'نص عربي\nثانٍ',category:'فلسفة',format:'plain'}
const source={...fixture,writings:[writing]}
const sourceHash=await sourceDigest(source,'writing:a')
const translation={locale:'en',title:'A question',text:'An English text.',sourceHash}
const ownerDraft={...source,translationDrafts:{'writing:a':translation}}
assert.equal((await publicPayload(ownerDraft)).translationDrafts,undefined)
assert.equal((await publicPayload(ownerDraft)).translations?.['writing:a'],undefined)
const approved=await approveTranslation(translation,source,'writing:a')
const published={...source,translations:{'writing:a':approved}}
assert.equal((await resolvePublishedTranslations(published)).translations['writing:a'].title,'A question')
const edited={...published,writings:[{...writing,text:'مصدر تغير'}]}
assert.equal((await resolvePublishedTranslations(edited)).translations?.['writing:a'],undefined)
```

- [ ] Run `node scripts/test-translations.mjs`; observe missing approval/freshness behavior fail.
- [ ] Implement native SHA-256 and validation. Public catalogue accepts only `en`, known source keys, valid 64-hex hash, title up to 300 and text up to 60000 characters; empty title is allowed only for `bio`. Reject unknown record keys. Private record editing never mutates approved entries. Include `sha256('abc') = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` as an independent hash vector.
- [ ] Add cases for absent translations, Unicode/line breaks, unknown writing ID, removed writing, changed title/format, wrong locale/hash, oversized output and malicious HTML stored as text. Use independently calculated fixture digest in SQL parity tests.
- [ ] Run both new scripts and existing content tests; review and commit focused changes only.

### Task 3: Public database boundary and private persistence

**Files:** New CLI-generated migration under `supabase/migrations/`; create `supabase/tests/translations.sql`; extend `src/lib/cloud.ts` and private draft/backup callers.

**Interfaces:** `saveCloudDraft(userId, draft: OwnerDraft)` / `loadCloudDraft(userId): Promise<OwnerDraft>` keep private types. `publishContent(draft, revision)` sends only `await publicPayload(draft)` and returns `{content,revision}` while the editor retains and separately saves private drafts. Published-content callers continue receiving Content.

- [ ] Inspect actual constraints/triggers/ACLs and migration history with read-only metadata before preparing SQL; do not replay `setup-platform.sql`. Read Supabase skill and current docs before SQL implementation.
- [ ] Create failing local SQL tests inside `BEGIN ... ROLLBACK`: a valid public payload succeeds; adding top-level `translationDrafts` fails with check violation; a private draft is writable only by its owner; anon reads of the private row fail. Example rejection assertion:

```sql
do $$ begin
  begin
    update public.kumeel_published
    set content = content || '{"translationDrafts":{}}'::jsonb where id='main';
    raise exception 'TEST FAILED: private field accepted';
  exception when check_violation then null;
  end;
end $$;
```

- [ ] Run against synthetic local data and record the expected failure before adding the boundary. Discover installed CLI commands with `supabase --help`; create the migration via `supabase migration new reviewed_translations`.
- [ ] Add an immutable validation function and CHECK on the published JSON: no draft field; catalogue object, allowed language/keys/shape, lengths, SHA format and matching current source digest. Publishing an edited source must remove invalid entries first; direct REST writes with old translations are rejected. Keep existing revision trigger, editor authorization and size limit. Empty legacy catalogues are valid.
- [ ] Validate private-draft RLS and allowlisted publish payload through real local API calls for anon, non-editor and owner; simulate two revisions and require stale revision failure without overwrite. Include an exact UTF-8 digest parity assertion between JS and SQL.
- [ ] Run local migration and tests, inspect advisors locally where available, and prepare rollback SQL restoring the prior constraint/function definition without deleting source data. Do not run the migration on the live project.
- [ ] Review and commit migration, tests and task-specific persistence hunks only.

### Task 4: English rendering, switch and SSR integration

**Files:** Create `LanguageSwitch.tsx`, `EnglishPages.tsx`; extend App, header/footer, `src/main.tsx`, SSR exports, content scoping, public-content/HTML handlers, Worker, prerender script and logical CSS rules.

**Interfaces:** `LanguageSwitch({locale,arabicPath,englishAvailable})`; `EnglishPages({content,route})` consumes already-resolved public Content. Worker and prerender await `resolvePublishedTranslations` before render; browser uses the server's resolved payload and repeats resolution after published/draft updates.

- [ ] Add failing render assertions:

```js
assert.ok(render(safeContent,'/en/').includes('Kumeel Al Nahab'))
assert.ok(render(safeContent,'/en/writings').includes('No English translations'))
assert.ok(!render(safeContent,'/en/').includes(privateSentinel))
```

- [ ] Run `node scripts/test-i18n.mjs` and observe English render behavior fail.
- [ ] Render only the approved scope with the English dictionary, links and logical layout. No Arabic bio/title fallback masquerading as English. Missing `/en/about` shows English notice and original link; detail without a current translation is 404. Unsupported English sections are 404; public English navigation links actual Arabic URLs with an Arabic label.
- [ ] Add accessible language links preserving the current counterpart when available. Persist explicit clicks as preference with storage errors handled; do not auto-navigate on mount. Missing counterpart links English writing list with an availability notice. Update `html lang/dir` in SSR and hydration consistently, including errors.
- [ ] Test localized hydration data includes only page-scoped approved translations; body, JSON-LD and chat corpus contain no private sentinel. Keep existing Arabic chat and disclose its language on English pages.
- [ ] Run new tests plus existing platform/design/release tests; browser-check 390px and desktop in both directions with Playwright skill, direct navigation and keyboard activation. Review focused changes and commit.

### Task 5: Locale SEO and sitemap

**Files:** Extend `src/lib/pages.ts`, API sitemap/HTML handlers, Worker and prerender integration; extend platform, i18n and published tests.

**Interfaces:** page metadata adds locale-aware language/direction and valid alternates derived from the resolved content. `publicPaths(content)` includes the English surface and current translations only; central helper supplies both API and Worker.

- [ ] Add failing metadata assertions:

```js
const enHead=renderHead(safeContent,pageInfo(safeContent,'/en/writings/a'),origin)
assert.ok(enHead.includes('href="https://kumeelalnahab.com/en/writings/a"'))
assert.ok(enHead.includes('hreflang="ar"'))
assert.ok(enHead.includes('hreflang="en"'))
assert.ok(!publicPaths(staleContent).includes('/en/writings/a'))
```

- [ ] Run platform/i18n scripts; observe absent alternates fail.
- [ ] Add self-canonical URLs, English metadata and inLanguage while retaining one Person identity. Add reciprocal `ar`/`en`/`x-default` only for available valid pairs. Include `/en/` and `/en/writings`; include English about/details only when their content is current and published. About without content is noindex; missing detail is 404/noindex. No invented translation dates.
- [ ] Update head replacement to remove duplicate hreflang metadata and ensure hydration does not overwrite English metadata with Arabic. Test old source/removed entry invalidation across HTML, JSON-LD, sitemap and language switch, including a direct URL.
- [ ] Run `npm run verify`; review and commit focused changes only.

### Task 6: Owner-only translation API

**Files:** Extend `api/edit-assist.mjs`, `src/lib/ai-assist.ts`, `scripts/test-edit-assist.mjs` and provider mock cases.

**Interfaces:** `requestAssist('translate',{title,text,format,sourceLanguage:'ar',targetLanguage:'en'})` returns `{title,text}` only. No persistence, approval or publication is performed by this endpoint.

- [ ] Add failing request cases using the existing `createHandler` test harness: unauthorized request must return 401 with zero provider calls; wrong language/oversized text returns 400; valid owner receives title/text; malformed provider result returns 502. Include HTML/Markdown and injected instruction cases.
- [ ] Run `node scripts/test-edit-assist.mjs`; observe unsupported task failure on the authorized valid case.
- [ ] Add task schema and instructions for faithful translation preserving paragraphs, rhetorical questions and the selected plain/markdown format. Do not reuse the proofreading no-rewrite ratio for translation or silently shorten output. Set a task-specific output budget suitable for the maximum input and reject incomplete JSON. Browser computes encoded request size before sending; server enforces its existing body limit.
- [ ] Test 12000/12001-character inputs, unknown fields/languages, timeout/429, missing provider, partial JSON and oversize output without persistence side effects. Existing proofread/alt/summary/quiz tests must remain green.
- [ ] Review and commit only this API/client/test task.

### Task 7: Private translation review editor

**Files:** Create `AdminTranslations.tsx`; connect to `AdminAssist.tsx`, private draft state, cloud persistence and admin backup import/export validation. Extend translation and design tests.

**Interfaces:** editor receives `OwnerDraft`, private save callback and explicit publish callback with revision. Key is `bio` or `writing:id`; generation captures `key` and `sourceHash` before request. Result is discarded from automatic application if selection/source changes while waiting.

- [ ] Write failing state tests: generation updates only the private entry; approve copies a reviewed record into the approved catalogue without publishing; a second draft edit leaves the approved version unchanged; source edit requires review; stale response never overwrites another selected writing. Restore/import of private backups must not publish.
- [ ] Run `node scripts/test-translations.mjs`; observe absent review state behavior fail.
- [ ] Implement source/translation side-by-side editing, manual input, generate/save-private/approve/publish actions with distinct labels. Show no translation, private draft, approved, and source-changed states. Publishing must call guarded `publishContent` and keep unsent private work on errors or revision conflict.
- [ ] Cover owner reload from cloud draft, storage failure, provider failure, repeated click while busy, removal/unpublish of an approved translation and re-approval against new source. Do not send production content to Gemini for a test without a selected owner action.
- [ ] Run the full local test suite and browser-check admin with a local synthetic authenticated fixture; do not weaken deployed auth to enable a test. Commit focused task hunks only.

### Task 8: Integrated verification, preview and release gate

**Files:** Extend `scripts/test-release.mjs`, `scripts/test-published.mjs`, translation SQL tests, `docs/development.md`, `docs/launch.md`, `docs/search-visibility.md`; add `docs/language-translation.md` with configuration, review workflow and rollback.

**Interfaces:** local release checks use a local Worker URL; published checks remain read-only. Record exact commands, exit codes, fixture source and preview URLs/screenshots in the handoff.

- [ ] Add local HTTP tests for Arabic/English home, translated/missing/stale detail, absent/approved bio, unsupported section, HEAD/404, body limit and unauthorized translation. Verify direct REST visibility in local tests and all public response bodies lack a unique private draft marker.
- [ ] Run `npm run verify`, then build/start local Worker with automatic `.env` loading disabled and run release checks against it. Run migration tests and JS/SQL digest parity with synthetic local data.
- [ ] Use Playwright to review direct URLs, switching, mobile/desktop layout, keyboard/focus, no hydration mismatch, manual translation and private-save/review/publication state. A provider-backed synthetic translation smoke is optional and must be labelled separately from mocked-provider coverage; never claim a real model call from a mock.
- [ ] Summarize remaining warnings, test results and deployment/DB state. Provide exact migration diff, backup and rollback strategy, then request separate owner approval before live mutation. If no local database runtime is available, report that specific missing verification; do not substitute production as a test target.
- [ ] After that approval only: verify target `jigypvbqiuakdatkzoul`, back up the affected metadata/settings using an approved method, apply the reviewed additive migration, verify advisors and run non-destructive boundary checks; deploy the checked build, rerun remote smoke and report version. No bulk translation or owner-content publication on the user's behalf.
- [ ] A rollback must restore compatible Worker and database definitions while preserving Arabic and private drafts. Never run reset/seed/whole-platform SQL. Document any public translation removal explicitly.

## Self-review / Coverage Map

- Locale and route contracts: Tasks 1, 4. Private/public separation and backward compatibility: Tasks 2, 3, 7.
- Source freshness, deletion and concurrency: Tasks 2, 3, 5, 7. Owner auth/provider and no auto-publication: Tasks 6, 7.
- English scope, fallback labels and Arabic chat: Task 4. SEO/canonical/hreflang/sitemap: Task 5.
- Synthetic DB tests, browser evidence, documentation, authorization and rollback: Tasks 3, 8.
- No live resources have been modified by creating this plan. Existing production remains on the previously deployed SEO release until separately authorized.
