# Writing dialogue release — 2026-10-17

Readers can submit opinions directly below an approved writing. Opinions remain private until the owner approves them. The owner can test a writing with a private AI critic and copy selected exchanges into the normal publication draft.

## Verification

- `npm run verify`: lint, build, application and API tests, release checks, and Cloudflare deployment dry run passed.
- `node scripts/test-community-db.mjs`: repeatable SQL setup, role isolation, optimistic locking, review and shared daily limits passed in the isolated database.
- Live database: `community.sql` dependencies were present; `writing-dialogue.sql` applied transactionally after a public/private-schema backup.
- The public snapshot still contained starter writing IDs. Only its `writings` field was replaced using the existing approved-writing adoption rule and a revision precondition; revision advanced from 1 to 2. Other content was preserved.
- A rollback-only live transaction verified private pending opinions, owner approval, public visibility after approval, private session persistence, and RLS enabled on all three dialogue tables.
- Browser on the deployed domain: a temporary confirmed member submitted an opinion; the owner approved it; an unauthenticated visitor saw it. The owner generated a real AI objection, saved a reply with “save and close”, and reopened the two-turn session.
- Test opinion, review entry, private session, quota and member account were removed after verification. No test exchange was added to public writing content.
- Actual owner mobile view and home mobile screenshots were inspected. The language navigation had inherited the collapsed main-menu positioning and obscured the title; its layout is now scoped to header tools. The mobile hero uses a 30–40px fluid size and 1.6 line height.

## Behavioral corrections

Saving and closing now persists the pending answer before closing and retains it on failure. Leaving the tab or changing writing warns about unsaved input. Duplicate identical exchanges and invalid rounds are rejected before saving the publication draft. Session loading pages beyond 200 records, so coverage counts include all sessions. The owner sees saved turns, completed replies, and rounds in the draft as separate counts. Review entries display writing titles rather than internal IDs.

## Recovery

The pre-change database dump and published snapshot are local ignored artifacts under `artifacts/dialogue-release/`. Cloudflare deployment history was recorded there before publishing. Roll back application code using the previous recorded Worker version if needed; the additive SQL can remain. Any content restore must compare the current revision first to avoid overwriting later owner edits.
