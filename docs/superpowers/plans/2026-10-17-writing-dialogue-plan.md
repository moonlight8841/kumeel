# Writing Dialogue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let members write a reviewed opinion directly under a writing, and give the owner a private AI sparring partner whose chosen rounds can be published under the writing.

**Architecture:** Published rounds live in an optional `exchange` field on each writing inside the existing content JSON, so they travel through the current draft → publish flow and SSR. Reader opinions and private sparring sessions live in new Supabase tables written only through security-definer RPCs that reuse the community quota, actor and review-log primitives. The sparring partner is one new task in the existing owner-only edit assistant.

**Tech Stack:** React 18, TypeScript, Vite SSR, Supabase Postgres (RLS + RPC), Gemini with Workers AI fallback via `api/_shared/owner-ai.mjs`. Tests: `node:test`, Vite `ssrLoadModule`, PGlite. No new runtime dependency.

**Spec:** `docs/superpowers/specs/2026-10-17-writing-dialogue-design.md`

## Global Constraints

- Work only in `/home/bob/kumeel`. Preserve the untracked `.mcp.json`; never stage it.
- Arabic UI copy exactly as written in this plan. RTL layout; reuse existing classes before adding CSS.
- Reader opinion: display name 2–60 chars, body 10–2000 chars (trimmed). Up to 100 published opinions per writing. Confirmed-email members only.
- Daily limit shared with community replies: 20 per account (`community_limit(actor,'comment')`).
- Exchange: 1–5 rounds per writing; objection 20–2000 chars, reply 1–4000 chars, `publishedAt` ISO timestamp, `style` ∈ `logic|history|skeptic`. Objection text is published exactly as generated.
- Sparring session: ≤40 turns; turn `role` ∈ `critic|owner`, `text` 1–4000, optional `quote` ≤500; only keys `role,text,quote`.
- Objection task: ≤6 turns sent, writing text 20–12000 chars, request body ≤30000 bytes, `quote` kept only if it appears verbatim in the writing.
- No live SQL, no deploy, no production data reads under this plan. Applying `supabase/writing-dialogue.sql` and publishing happen after owner approval (Task 9 lists the steps).
- Do not modify `kumeel_review_community` or `supabase/community.sql`.
- Execute inline unless the user explicitly selects delegation.

## File Map

New:
- `src/lib/exchange.ts` — `ExchangeRound` type, styles, labels, `validExchange`.
- `src/components/WritingExchange.tsx` — public rendering of published rounds.
- `src/lib/writing-responses.ts` — client calls and error copy for reader opinions.
- `src/components/WritingResponses.tsx` — opinions list + form under a writing.
- `src/lib/sparring.ts` — session types, RPC calls, objection payload trimming, `publishRound`, `untestedWritings`.
- `src/components/admin/AdminSparring.tsx` — the «المحاور» tab and the overview nudge.
- `supabase/writing-dialogue.sql` — tables, policies, RPCs.
- `scripts/test-dialogue.mjs` — SSR and pure-function tests for this feature.

Modified:
- `src/content.ts` — `Writing.exchange` and validation.
- `src/components/PublicationPage.tsx` — render exchange + responses; replace salon link on writings.
- `src/lib/navigation.ts` — `safeNext`.
- `src/components/MemberSpace.tsx` — return to `next` after sign-in.
- `src/components/CommunityReview.tsx` — «آراء على الكتابات» queue.
- `api/edit-assist.mjs` — `objection` task; pass payload to `output`.
- `src/lib/ai-assist.ts` — `objection` request type.
- `src/lib/admin.ts`, `src/components/AdminPanel.tsx`, `src/components/admin/AdminOverview.tsx` — tab wiring and nudge.
- `src/platform.css`, `src/styles/admin.css` — small additions.
- `scripts/test-community-db.mjs`, `scripts/test-edit-assist.mjs`, `package.json` (`test` script), `docs/community.md`.

---

### Task 1: Exchange model and validation

**Files:**
- Create: `src/lib/exchange.ts`, `scripts/test-dialogue.mjs`
- Modify: `src/content.ts` (type `Writing` line 7; `validContent` writings clause), `package.json` (`test` script)

**Interfaces:**
- Produces: `sparringStyles`, `type SparringStyle`, `styleLabel: Record<SparringStyle,string>`, `type ExchangeRound = {style;objection;reply;publishedAt}`, `MAX_ROUNDS = 5`, `validExchange(value: unknown): value is ExchangeRound[]`. `Writing.exchange?: ExchangeRound[]`.

- [ ] **Step 1: Write the failing test** — create `scripts/test-dialogue.mjs`:

```js
import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createServer} from 'vite'
const server=await createServer({server:{middlewareMode:true},appType:'custom'})
try{
 const {initialContent,validContent}=await server.ssrLoadModule('/src/content.ts')
 const {validExchange}=await server.ssrLoadModule('/src/lib/exchange.ts')
 const {sourceDigest}=await server.ssrLoadModule('/src/lib/source-hash.mjs')
 const round={style:'logic',objection:'تفترض المقدمة الأولى دون أن تبيّن سببها.',reply:'لأن الثانية تلزم عنها.',publishedAt:'2026-10-17T10:00:00.000Z'}
 const writing={id:'dialogue',title:'الحرية',category:'فلسفة',text:'الحرية أن تختار ما تريد. ومن لا يختار لا يعيش حقًا.'}
 const withRounds=rounds=>({...initialContent,writings:[{...writing,exchange:rounds}]})

 await test('Exchange rounds are optional, bounded and strictly shaped',()=>{
  assert.equal(validContent({...initialContent,writings:[writing]}),true)
  assert.equal(validContent(withRounds([round])),true)
  assert.equal(validContent(withRounds(Array(5).fill(round))),true)
  for(const bad of [[],Array(6).fill(round),[{...round,style:'oracle'}],[{...round,objection:'قصير'}],[{...round,objection:'ا'.repeat(2001)}],[{...round,reply:'  '}],[{...round,reply:'ا'.repeat(4001)}],[{...round,publishedAt:'yesterday'}],[{...round,extra:true}],'not-array'])
   assert.equal(validContent(withRounds(bad)),false,JSON.stringify(bad).slice(0,60))
  assert.equal(validExchange([round]),true)
 })

 await test('Publishing a round never stales the English translation',async()=>{
  const plain={...initialContent,writings:[writing]}
  assert.equal(await sourceDigest(withRounds([round]),'writing:dialogue'),await sourceDigest(plain,'writing:dialogue'))
 })
}finally{await server.close()}
```

- [ ] **Step 2: Run to verify it fails**

Run: `node scripts/test-dialogue.mjs`
Expected: FAIL — cannot load `/src/lib/exchange.ts`.

- [ ] **Step 3: Implement** — create `src/lib/exchange.ts`:

```ts
// Published sparring rounds: an AI objection and the author's reply, chosen by the owner.
export const sparringStyles=['logic','history','skeptic'] as const
export type SparringStyle=typeof sparringStyles[number]
export const styleLabel:Record<SparringStyle,string>={logic:'المنطقي',history:'المؤرّخ',skeptic:'المتشكك'}
export type ExchangeRound={style:SparringStyle;objection:string;reply:string;publishedAt:string}
export const MAX_ROUNDS=5
const keys=['style','objection','reply','publishedAt']

export function validExchange(value:unknown):value is ExchangeRound[]{
 return Array.isArray(value)&&value.length>=1&&value.length<=MAX_ROUNDS&&value.every(r=>{
  if(!r||typeof r!=='object'||Array.isArray(r))return false
  const v=r as Record<string,unknown>
  return Object.keys(v).every(k=>keys.includes(k))
   &&sparringStyles.includes(v.style as SparringStyle)
   &&typeof v.objection==='string'&&v.objection.trim().length>=20&&v.objection.length<=2000
   &&typeof v.reply==='string'&&v.reply.trim().length>=1&&v.reply.length<=4000
   &&typeof v.publishedAt==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v.publishedAt)&&Number.isFinite(Date.parse(v.publishedAt))
 })
}
```

In `src/content.ts` add `import type {ExchangeRound} from './lib/exchange'` and `import {validExchange} from './lib/exchange'` (one import line: `import {validExchange,type ExchangeRound} from './lib/exchange'`) near the other imports; change the `Writing` type to end with `; publishedAt?:string; exchange?:ExchangeRound[] }`; in the writings clause of `validContent` append `&& (w.exchange===undefined||validExchange(w.exchange))` right after the `w.format` check.

In `package.json` `test` script, append ` && node scripts/test-dialogue.mjs` after `node scripts/test-chat.mjs`.

- [ ] **Step 4: Run to verify it passes**

Run: `node scripts/test-dialogue.mjs && node scripts/test-platform.mjs && node scripts/test-translations.mjs`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/exchange.ts src/content.ts scripts/test-dialogue.mjs package.json
git commit -m "feat(content): optional published sparring rounds on writings"
```

---

### Task 2: Show published rounds and point readers to `#responses`

**Files:**
- Create: `src/components/WritingExchange.tsx`
- Modify: `src/components/PublicationPage.tsx` (counterpoint aside and `publication-actions` lines), `src/platform.css` (append), `scripts/test-dialogue.mjs`

**Interfaces:**
- Consumes: `ExchangeRound`, `styleLabel` (Task 1).
- Produces: `<WritingExchange rounds={ExchangeRound[]}/>`. Writing pages contain `href="#responses"`; Task 4 provides the `id="responses"` element.

- [ ] **Step 1: Write the failing test** — in `scripts/test-dialogue.mjs` add `const {render}=await server.ssrLoadModule('/src/entry-server.tsx')` after the other loads, and before `}finally` add:

```js
 await test('Writing pages render published rounds as escaped, labelled text and keep readers on the page',()=>{
  const markup=render(withRounds([{...round,reply:'<script>alert(1)</script>'}]),'/writings/dialogue')
  assert.ok(markup.includes('اعتراض وجواب'))
  assert.ok(markup.includes('اعتراض صاغه محاور آلي ونشره الكاتب'))
  assert.ok(markup.includes('المنطقي'))
  assert.ok(markup.includes(round.objection))
  assert.ok(markup.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
  assert.ok(!markup.includes('<script>alert(1)</script>'))
  assert.ok(markup.includes('href="#responses"'))
  assert.ok(!markup.includes('أكمل السؤال في مجلس الحوار'))
  assert.ok(!render({...initialContent,writings:[writing]},'/writings/dialogue').includes('اعتراض وجواب'))
 })
```

- [ ] **Step 2: Run to verify it fails**

Run: `node scripts/test-dialogue.mjs`
Expected: FAIL on `اعتراض وجواب`.

- [ ] **Step 3: Implement** — create `src/components/WritingExchange.tsx`:

```tsx
import {styleLabel,type ExchangeRound} from '../lib/exchange'
export function WritingExchange({rounds}:{rounds:ExchangeRound[]}){
 return <section className="publication-exchange" aria-labelledby="exchange-title"><h2 id="exchange-title">اعتراض وجواب</h2>
  {rounds.map((r,i)=><article key={i}><h3>اعتراض صاغه محاور آلي ونشره الكاتب <small>· {styleLabel[r.style]}</small></h3><p className="preserve-lines">{r.objection}</p><h3>جواب الكاتب</h3><p className="preserve-lines">{r.reply}</p></article>)}
 </section>
}
```

In `PublicationPage.tsx`: import it (`import {WritingExchange} from './WritingExchange'`); directly after the `{info.idea?.counterpoint && …}` aside add `{info.writing?.exchange && <WritingExchange rounds={info.writing.exchange}/>}`; replace `<a className="text-link" href="/salon">أكمل السؤال في مجلس الحوار ←</a>` with `{info.writing?<a className="text-link" href="#responses">اكتب رأيك ↓</a>:<a className="text-link" href="/salon">أكمل السؤال في مجلس الحوار ←</a>}`.

Append to `src/platform.css`:

```css
.publication-exchange{margin-block:35px;border-top:1px solid var(--line);padding-top:30px}.publication-exchange h2{font-size:30px}.publication-exchange article{padding:26px 30px;margin-top:20px;background:var(--sand);border-right:2px solid var(--accent)}.publication-exchange h3{font-size:15px;color:var(--color-ochre);margin-top:14px}.publication-exchange h3:first-child{margin-top:0}.publication-exchange p{font-size:17px;line-height:2.2;margin-top:8px}@media(max-width:600px){.publication-exchange article{padding:20px}.publication-exchange p{font-size:15px}}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run build && node scripts/test-dialogue.mjs && node scripts/test-platform.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/WritingExchange.tsx src/components/PublicationPage.tsx src/platform.css scripts/test-dialogue.mjs
git commit -m "feat(site): published objection and reply under writings"
```

---

### Task 3: Database tables and RPCs

**Files:**
- Create: `supabase/writing-dialogue.sql`
- Test: `scripts/test-community-db.mjs` (insert before the final `await db.close()` line)

**Interfaces:**
- Produces (Postgres, all `security definer`, `search_path=''`, execute granted to `authenticated` only):
  - `public.kumeel_send_writing_response(p_writing text,p_name text,p_body text) returns uuid`
  - `public.kumeel_review_writing_response(p_id uuid,p_revision integer,p_decision text,p_note text) returns void`
  - `public.kumeel_save_sparring(p_id uuid,p_revision integer,p_writing text,p_style text,p_turns jsonb) returns public.kumeel_sparring`
  - `public.kumeel_delete_sparring(p_id uuid) returns void`
  - Tables `public.kumeel_writing_responses` (select: author or editor), `public.kumeel_public_writing_responses` (select: everyone), `public.kumeel_sparring` (select: editor).
  - Errors reuse community codes: `COMMUNITY_AUTH`, `COMMUNITY_FORBIDDEN`, `COMMUNITY_NOT_PUBLISHED`, `COMMUNITY_NOT_FOUND`, `COMMUNITY_CONFLICT`, `COMMUNITY_LOCKED`, `COMMUNITY_NOTE_REQUIRED`, `COMMUNITY_CONTENT`, `COMMUNITY_LIMIT`.

- [ ] **Step 1: Write the failing test** — insert before `await db.close()` in `scripts/test-community-db.mjs`:

```js
await db.exec('reset role');await db.exec(`create table if not exists public.kumeel_published(id text primary key,content jsonb not null);grant select on public.kumeel_published to anon,authenticated;
 insert into public.kumeel_published values('main','{"bio":"","media":[],"writings":[{"id":"w1","title":"T","text":"x","category":"فلسفة"}]}') on conflict do nothing;`)
const dialogueSql=await readFile('supabase/writing-dialogue.sql','utf8');await db.exec(dialogueSql);await db.exec(dialogueSql)
const respond=(writing,body='A fair reading of the argument',name='Alice')=>db.query('select public.kumeel_send_writing_response($1,$2,$3) as id',[writing,name,body])
const judge=(id,rev,decision,note='')=>db.query('select public.kumeel_review_writing_response($1,$2,$3,$4)',[id,rev,decision,note])
await as('anon');await assert.rejects(respond('w1'),/permission denied/)
await as('authenticated',unconfirmed);await assert.rejects(respond('w1'),/COMMUNITY_AUTH/)
await as('authenticated',alice);await assert.rejects(respond('missing'),/COMMUNITY_NOT_PUBLISHED/);await assert.rejects(respond('w1','short'),/check constraint/)
const opinion=(await respond('w1')).rows[0].id
await assert.rejects(db.query("update public.kumeel_writing_responses set status='published'"),/permission denied/)
await assert.rejects(db.query("insert into public.kumeel_public_writing_responses(id,writing_id,author_name,body) values(gen_random_uuid(),'w1','Fake','Fake body text')"),/permission denied/)
assert.equal(await count('kumeel_writing_responses'),1)
await as('authenticated',bob);assert.equal(await count('kumeel_writing_responses'),0);await assert.rejects(judge(opinion,1,'published'),/COMMUNITY_FORBIDDEN/)
await as('anon');assert.equal(await count('kumeel_public_writing_responses'),0)
await as('authenticated',owner);await assert.rejects(judge(opinion,1,'rejected'),/COMMUNITY_NOTE_REQUIRED/);await assert.rejects(judge(opinion,2,'published'),/COMMUNITY_CONFLICT/);await assert.rejects(judge(opinion,1,'changes_requested','x y z'),/COMMUNITY_CONTENT/)
await judge(opinion,1,'published');await assert.rejects(judge(opinion,2,'published'),/COMMUNITY_LOCKED/)
assert.equal((await db.query("select count(*)::integer as n from public.kumeel_review_log where item_kind='writing_response'")).rows[0].n,1)
await as('anon');const shown=(await db.query('select * from public.kumeel_public_writing_responses')).rows;assert.equal(shown.length,1);assert.ok(!('author_id' in shown[0]));assert.equal(shown[0].writing_id,'w1')
await as('authenticated',owner);await judge(opinion,2,'rejected','Off topic');await as('anon');assert.equal(await count('kumeel_public_writing_responses'),0)
// Alice already used 2 of 20 shared replies today (one community reply, one opinion).
await as('authenticated',alice);for(let i=0;i<18;i++)await respond('w1','Reader response number '+i);await assert.rejects(respond('w1','The response over the limit'),/COMMUNITY_LIMIT/)
const turn={role:'critic',text:'Your first premise is assumed, not shown.'}
const spar=(id,rev,turns,style='logic')=>db.query('select * from public.kumeel_save_sparring($1,$2,$3,$4,$5::jsonb)',[id,rev,'w1',style,JSON.stringify(turns)])
await as('anon');await assert.rejects(db.query('select * from public.kumeel_sparring'),/permission denied/)
await as('authenticated',alice);await assert.rejects(spar(null,null,[turn]),/COMMUNITY_FORBIDDEN/);assert.equal(await count('kumeel_sparring'),0)
await as('authenticated',owner);const session=(await spar(null,null,[turn])).rows[0];assert.equal(session.revision,1)
for(const bad of [[{role:'judge',text:'x'}],[{...turn,extra:1}],[{...turn,text:''}],[{...turn,quote:'q'.repeat(501)}],Array(41).fill(turn),{}])await assert.rejects(spar(null,null,bad),/COMMUNITY_CONTENT/)
await assert.rejects(spar(null,null,[turn],'oracle'),/check constraint/)
const advanced=(await spar(session.id,1,[turn,{role:'owner',text:'It follows from the second.'}])).rows[0];assert.equal(advanced.revision,2);await assert.rejects(spar(session.id,1,[turn]),/COMMUNITY_CONFLICT/)
await assert.rejects(db.query("update public.kumeel_sparring set turns='[]'"),/permission denied/)
await as('authenticated',alice);assert.equal(await count('kumeel_sparring'),0);await assert.rejects(db.query('select public.kumeel_delete_sparring($1)',[session.id]),/COMMUNITY_FORBIDDEN/)
await as('authenticated',owner);await db.query('select public.kumeel_delete_sparring($1)',[session.id]);assert.equal(await count('kumeel_sparring'),0)
console.log('Writing dialogue: published-writing check, private queue, owner review, shared daily limit and owner-only sparring passed.')
```

- [ ] **Step 2: Run to verify it fails**

Run: `node scripts/test-community-db.mjs` (if PGlite is missing: `npm install --prefix artifacts/community-db @electric-sql/pglite@0.5.8 --ignore-scripts --no-audit --no-fund`)
Expected: FAIL — ENOENT `supabase/writing-dialogue.sql`.

- [ ] **Step 3: Implement** — create `supabase/writing-dialogue.sql`:

```sql
-- Kumeel: reader opinions on owner writings and the owner's private sparring sessions.
-- Additive; run after community.sql on jigypvbqiuakdatkzoul. Transactional and repeatable.
begin;
create table if not exists public.kumeel_writing_responses (
 id uuid primary key default gen_random_uuid(),
 writing_id text not null check(char_length(writing_id) between 1 and 150),
 author_id uuid not null references auth.users(id),
 author_name text not null check(char_length(btrim(author_name)) between 2 and 60),
 body text not null check(char_length(btrim(body)) between 10 and 2000),
 status text not null default 'pending' check(status in ('pending','published','rejected')),
 revision integer not null default 1, created_at timestamptz not null default now()
);
create table if not exists public.kumeel_public_writing_responses (
 id uuid primary key references public.kumeel_writing_responses(id),
 writing_id text not null, author_name text not null, body text not null, published_at timestamptz not null default now()
);
create table if not exists public.kumeel_sparring (
 id uuid primary key default gen_random_uuid(),
 writing_id text not null check(char_length(writing_id) between 1 and 150),
 style text not null check(style in ('logic','history','skeptic')),
 turns jsonb not null default '[]'::jsonb,
 revision integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists kumeel_writing_responses_owner on public.kumeel_writing_responses(author_id,writing_id,created_at desc);
create index if not exists kumeel_writing_responses_queue on public.kumeel_writing_responses(status,created_at);
create index if not exists kumeel_public_writing_responses_writing on public.kumeel_public_writing_responses(writing_id,published_at);
create index if not exists kumeel_sparring_writing on public.kumeel_sparring(writing_id,updated_at desc);
alter table public.kumeel_writing_responses enable row level security;
alter table public.kumeel_public_writing_responses enable row level security;
alter table public.kumeel_sparring enable row level security;
revoke all on public.kumeel_writing_responses,public.kumeel_public_writing_responses,public.kumeel_sparring from public,anon,authenticated;
grant select on public.kumeel_writing_responses,public.kumeel_sparring to authenticated;
grant select on public.kumeel_public_writing_responses to anon,authenticated;
drop policy if exists writing_responses_private on public.kumeel_writing_responses;
create policy writing_responses_private on public.kumeel_writing_responses for select to authenticated
 using (author_id=(select auth.uid()) or (select public.kumeel_is_secure_editor()));
drop policy if exists writing_responses_public on public.kumeel_public_writing_responses;
create policy writing_responses_public on public.kumeel_public_writing_responses for select to anon,authenticated using(true);
drop policy if exists sparring_owner on public.kumeel_sparring;
create policy sparring_owner on public.kumeel_sparring for select to authenticated using((select public.kumeel_is_secure_editor()));

-- Turn shape is checked here rather than in a constraint: RPC writers run as definer.
create or replace function kumeel_private.valid_sparring_turns(t jsonb) returns boolean
language sql immutable set search_path='' as $$
 -- Nested CASE fixes evaluation order: array/object functions never see the wrong type.
 select case when t is null or jsonb_typeof(t)<>'array' then false
 when jsonb_array_length(t)>40 then false
 else not exists(select 1 from jsonb_array_elements(t) e where
  case when jsonb_typeof(e)<>'object' then true
  else exists(select 1 from jsonb_object_keys(e) k where k not in ('role','text','quote'))
   or coalesce(e->>'role','') not in ('critic','owner')
   or case when jsonb_typeof(e->'text') is distinct from 'string' then true else char_length(e->>'text') not between 1 and 4000 end
   or case when not (e ? 'quote') then false when jsonb_typeof(e->'quote')<>'string' then true else char_length(e->>'quote')>500 end
  end)
 end
$$;
revoke all on function kumeel_private.valid_sparring_turns(jsonb) from public,anon,authenticated;

create or replace function public.kumeel_send_writing_response(p_writing text,p_name text,p_body text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=kumeel_private.community_actor(); result uuid;
begin
 -- Only writings in the public snapshot accept opinions; starter templates have no reader page.
 if p_writing is null or not exists(
  select 1 from public.kumeel_published p
  cross join lateral jsonb_array_elements(case when jsonb_typeof(p.content->'writings')='array' then p.content->'writings' else '[]'::jsonb end) w
  where p.id='main' and w->>'id'=p_writing) then
  raise exception 'COMMUNITY_NOT_PUBLISHED';
 end if;
 perform kumeel_private.community_limit(actor,'comment');
 insert into public.kumeel_writing_responses(writing_id,author_id,author_name,body) values(p_writing,actor,btrim(p_name),btrim(p_body)) returning id into result;
 return result;
end; $$;

create or replace function public.kumeel_review_writing_response(p_id uuid,p_revision integer,p_decision text,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=kumeel_private.community_actor(); reply public.kumeel_writing_responses;
begin
 if not public.kumeel_is_secure_editor() then raise exception 'COMMUNITY_FORBIDDEN' using errcode='42501'; end if;
 if p_decision is null or p_decision not in ('published','rejected') or p_note is null or char_length(p_note)>1000 then raise exception 'COMMUNITY_CONTENT'; end if;
 if p_decision='rejected' and char_length(btrim(p_note))<3 then raise exception 'COMMUNITY_NOTE_REQUIRED'; end if;
 select * into reply from public.kumeel_writing_responses where id=p_id for update;
 if not found then raise exception 'COMMUNITY_NOT_FOUND'; end if;
 if reply.revision is distinct from p_revision then raise exception 'COMMUNITY_CONFLICT'; end if;
 if reply.status not in ('pending','published') or (p_decision='published' and reply.status<>'pending') then raise exception 'COMMUNITY_LOCKED'; end if;
 if p_decision='published' then
  insert into public.kumeel_public_writing_responses(id,writing_id,author_name,body) values(reply.id,reply.writing_id,reply.author_name,reply.body);
 else delete from public.kumeel_public_writing_responses where id=p_id; end if;
 update public.kumeel_writing_responses set status=p_decision,revision=revision+1 where id=p_id;
 insert into public.kumeel_review_log(item_id,item_kind,reviewer_id,decision,note,revision) values(p_id,'writing_response',actor,p_decision,btrim(p_note),p_revision);
end; $$;

create or replace function public.kumeel_save_sparring(p_id uuid,p_revision integer,p_writing text,p_style text,p_turns jsonb)
returns public.kumeel_sparring language plpgsql security definer set search_path='' as $$
declare item public.kumeel_sparring;
begin
 if not public.kumeel_is_secure_editor() then raise exception 'COMMUNITY_FORBIDDEN' using errcode='42501'; end if;
 if not kumeel_private.valid_sparring_turns(p_turns) then raise exception 'COMMUNITY_CONTENT'; end if;
 if p_id is null then
  insert into public.kumeel_sparring(writing_id,style,turns) values(p_writing,p_style,p_turns) returning * into item;
 else
  select * into item from public.kumeel_sparring where id=p_id for update;
  if not found then raise exception 'COMMUNITY_NOT_FOUND'; end if;
  if item.revision is distinct from p_revision then raise exception 'COMMUNITY_CONFLICT'; end if;
  update public.kumeel_sparring set turns=p_turns,revision=revision+1,updated_at=now() where id=p_id returning * into item;
 end if;
 return item;
end; $$;

create or replace function public.kumeel_delete_sparring(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.kumeel_is_secure_editor() then raise exception 'COMMUNITY_FORBIDDEN' using errcode='42501'; end if;
 delete from public.kumeel_sparring where id=p_id;
end; $$;

revoke all on function public.kumeel_send_writing_response(text,text,text),public.kumeel_review_writing_response(uuid,integer,text,text),public.kumeel_save_sparring(uuid,integer,text,text,jsonb),public.kumeel_delete_sparring(uuid) from public,anon,authenticated;
grant execute on function public.kumeel_send_writing_response(text,text,text),public.kumeel_review_writing_response(uuid,integer,text,text),public.kumeel_save_sparring(uuid,integer,text,text,jsonb),public.kumeel_delete_sparring(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
```

- [ ] **Step 4: Run to verify it passes**

Run: `node scripts/test-community-db.mjs`
Expected: PASS, including the line `Writing dialogue: … passed.` If `anon` gets `permission denied for function` instead of `permission denied` the regex still matches.

- [ ] **Step 5: Commit**

```bash
git add supabase/writing-dialogue.sql scripts/test-community-db.mjs
git commit -m "feat(db): reviewed reader opinions on writings and owner-only sparring sessions"
```

---

### Task 4: Reader opinions under the writing and return after sign-in

**Files:**
- Create: `src/lib/writing-responses.ts`, `src/components/WritingResponses.tsx`
- Modify: `src/lib/navigation.ts` (append), `src/components/MemberSpace.tsx` (auth effect), `src/components/PublicationPage.tsx`, `scripts/test-dialogue.mjs`

**Interfaces:**
- Consumes: RPC `kumeel_send_writing_response`, tables from Task 3; `communityError` from `src/lib/community.ts`.
- Produces: `safeNext(value:string|null|undefined, origin:string): string|null`; `type PublicResponse`, `type OwnResponse`, `responseError(e)`, `listResponses(writingId)`, `listMyResponses(writingId,userId)`, `sendResponse(writingId,name,body)`, `listResponseQueue(status)`, `reviewResponse(id,revision,decision,note)`; `<WritingResponses writingId/>` rendering `<section id="responses">`.

- [ ] **Step 1: Write the failing test** — in `scripts/test-dialogue.mjs` add `const {safeNext}=await server.ssrLoadModule('/src/lib/navigation.ts')` with the other loads and before `}finally`:

```js
 await test('Sign-in returns only to same-site paths',()=>{
  const origin='https://kumeelalnahab.com'
  assert.equal(safeNext('/writings/x#responses',origin),'/writings/x#responses')
  assert.equal(safeNext('/writings/%D8%A7',origin),'/writings/%D8%A7')
  for(const bad of [null,'','writings/x','//evil.com','/\\evil.com','https://evil.com','/x\nSet-Cookie','/'+'a'.repeat(400)])assert.equal(safeNext(bad,origin),null,String(bad))
 })

 await test('Writing pages carry the opinions section shell during SSR',()=>{
  const markup=render({...initialContent,writings:[writing]},'/writings/dialogue')
  assert.ok(markup.includes('id="responses"'))
  assert.ok(markup.includes('آراء القراء'))
  assert.ok(!render({...initialContent,ideas:initialContent.ideas.map(i=>({...i,sample:false}))},'/ideas/certainty').includes('id="responses"'))
 })
```

- [ ] **Step 2: Run to verify it fails**

Run: `node scripts/test-dialogue.mjs`
Expected: FAIL — `safeNext is not a function`.

- [ ] **Step 3: Implement**

Append to `src/lib/navigation.ts`:

```ts
// Post-login return target: same-origin path only, never a protocol-relative or encoded escape.
export function safeNext(value:string|null|undefined,origin:string):string|null{
 if(!value||value.length>300||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u001f\u007f]/.test(value))return null
 try{const url=new URL(value,origin);return url.origin===origin?url.pathname+url.search+url.hash:null}catch{return null}
}
```

Create `src/lib/writing-responses.ts`:

```ts
import {supabase} from './cloud'
import {communityError} from './community'
export type PublicResponse={id:string;author_name:string;body:string;published_at:string}
export type OwnResponse={id:string;writing_id:string;author_name:string;body:string;status:string;revision:number;created_at:string}
export function responseError(error:unknown){
 const e=error as {code?:string;message?:string}
 if(['PGRST205','PGRST202','42P01','42883'].includes(e?.code??''))return 'الآراء غير متاحة حاليًا.'
 const m=e?.message??''
 if(m.includes('COMMUNITY_NOT_PUBLISHED'))return 'هذه الكتابة لا تستقبل آراء الآن.'
 if(m.includes('COMMUNITY_CONTENT')||e?.code==='23514')return 'الاسم من ٢ إلى ٦٠ حرفًا، والرأي من ١٠ إلى ٢٠٠٠ حرف.'
 if(m.includes('COMMUNITY_LIMIT'))return 'وصلت إلى الحد اليومي للردود والآراء. حاول غدًا.'
 return communityError(error)
}
export async function listResponses(writingId:string){
 const {data,error}=await supabase.from('kumeel_public_writing_responses').select('id,author_name,body,published_at').eq('writing_id',writingId).order('published_at').limit(100)
 if(error)throw error;return data as PublicResponse[]
}
export async function listMyResponses(writingId:string,userId:string){
 const {data,error}=await supabase.from('kumeel_writing_responses').select('id,writing_id,author_name,body,status,revision,created_at').eq('writing_id',writingId).eq('author_id',userId).neq('status','published').order('created_at',{ascending:false}).limit(20)
 if(error)throw error;return data as OwnResponse[]
}
export async function sendResponse(writingId:string,name:string,body:string){
 const {error}=await supabase.rpc('kumeel_send_writing_response',{p_writing:writingId,p_name:name,p_body:body});if(error)throw error
}
export async function listResponseQueue(status:'pending'|'published'){
 const {data,error}=await supabase.from('kumeel_writing_responses').select('id,writing_id,author_name,body,status,revision,created_at').eq('status',status).order('created_at').limit(50)
 if(error)throw error;return data as OwnResponse[]
}
export async function reviewResponse(id:string,revision:number,decision:'published'|'rejected',note:string){
 const {error}=await supabase.rpc('kumeel_review_writing_response',{p_id:id,p_revision:revision,p_decision:decision,p_note:note});if(error)throw error
}
```

Create `src/components/WritingResponses.tsx`:

```tsx
import {useEffect,useState,type FormEvent} from 'react'
import {supabase} from '../lib/cloud'
import {statusLabel} from '../lib/community'
import {listMyResponses,listResponses,responseError,sendResponse,type OwnResponse,type PublicResponse} from '../lib/writing-responses'
type Viewer='unknown'|'guest'|'unconfirmed'|'member'
const date=(iso:string)=>new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',calendar:'gregory'}).format(new Date(iso))
export function WritingResponses({writingId}:{writingId:string}){
 const [items,setItems]=useState<PublicResponse[]>([]),[mine,setMine]=useState<OwnResponse[]>([]),[viewer,setViewer]=useState<Viewer>('unknown')
 const [name,setName]=useState(''),[body,setBody]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[version,setVersion]=useState(0)
 useEffect(()=>{let active=true;listResponses(writingId).then(d=>{if(active)setItems(d)}).catch(e=>{if(active)setMessage(responseError(e))});return()=>{active=false}},[writingId,version])
 useEffect(()=>{let active=true;const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{if(!active)return;const user=s?.user;setViewer(!user?'guest':user.email_confirmed_at?'member':'unconfirmed');if(user)listMyResponses(writingId,user.id).then(d=>{if(active)setMine(d)}).catch(()=>{});else setMine([])});return()=>{active=false;subscription.unsubscribe()}},[writingId,version])
 useEffect(()=>{if(!body.trim())return;const h=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue=''};window.addEventListener('beforeunload',h);return()=>window.removeEventListener('beforeunload',h)},[body])
 async function submit(e:FormEvent){e.preventDefault();if(busy)return;setBusy(true);setMessage('');try{await sendResponse(writingId,name,body);setBody('');setMessage('أُرسل رأيك للمراجعة. لن يظهر للناس حتى تعتمده الإدارة.');setVersion(v=>v+1)}catch(err){setMessage(responseError(err))}finally{setBusy(false)}}
 const login=`/member?next=${encodeURIComponent(`/writings/${encodeURIComponent(writingId)}#responses`)}`
 return <section id="responses" className="community-discussion writing-responses" aria-labelledby="responses-title"><h2 id="responses-title">آراء القراء</h2><p>أنصف الفكرة ثم أضف سؤالًا أو اعتراضًا. يظهر الرأي بعد المراجعة.</p>
  {items.length===0&&!message&&<p className="sample-note">لا آراء منشورة بعد. كن أول من يكتب.</p>}
  {items.map(r=><article key={r.id}><strong>{r.author_name}</strong> <small>{date(r.published_at)}</small><p className="preserve-lines">{r.body}</p></article>)}
  {mine.map(r=><article key={r.id} className="is-own"><strong>{r.author_name}</strong> <small>رأيك · {statusLabel[r.status]}</small><p className="preserve-lines">{r.body}</p></article>)}
  {viewer==='member'&&<form onSubmit={e=>void submit(e)}><h3>اكتب رأيك</h3><label>اسم العرض<input required minLength={2} maxLength={60} value={name} disabled={busy} onChange={e=>setName(e.target.value)}/></label><label>رأيك<textarea required minLength={10} maxLength={2000} value={body} disabled={busy} onChange={e=>setBody(e.target.value)}/></label><small>{body.length.toLocaleString('ar-SA')} / ٢٠٠٠</small><button className="primary" disabled={busy}>{busy?'جارٍ الإرسال…':'أرسل للمراجعة'}</button></form>}
  {viewer==='guest'&&<a className="primary" href={login}>سجّل الدخول لتكتب رأيك</a>}
  {viewer==='unconfirmed'&&<p>أكّد بريدك الإلكتروني أولًا لتكتب رأيك.</p>}
  <p role="status">{message}</p>
 </section>
}
```

In `PublicationPage.tsx` import `WritingResponses` and add `{info.writing && <WritingResponses writingId={info.writing.id}/>}` right after the `publication-actions` status paragraph, inside the `<article>`.

In `MemberSpace.tsx` import `safeNext` from `'../lib/navigation'`, and inside the `onAuthStateChange` callback, after `setChecking(false);`, add:

```ts
if(session?.user){const next=safeNext(new URLSearchParams(location.search).get('next'),location.origin);if(next){location.assign(next);return}}
```

Append to `src/platform.css`: `.writing-responses{margin-block:40px}.writing-responses article.is-own{opacity:.8;border-right:2px dashed var(--accent);padding-right:14px}.writing-responses small{color:var(--muted);font-size:12px}`

- [ ] **Step 4: Run to verify it passes**

Run: `npm run build && node scripts/test-dialogue.mjs && node scripts/test-platform.mjs && npm run lint`
Expected: PASS, no lint errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/navigation.ts src/lib/writing-responses.ts src/components/WritingResponses.tsx src/components/PublicationPage.tsx src/components/MemberSpace.tsx src/platform.css scripts/test-dialogue.mjs
git commit -m "feat(site): reviewed reader opinions directly under each writing"
```

---

### Task 5: Review queue for opinions

**Files:**
- Modify: `src/components/CommunityReview.tsx`

**Interfaces:**
- Consumes: `listResponseQueue`, `reviewResponse`, `responseError`, `OwnResponse` (Task 4).
- Produces: a «آراء على الكتابات» list in the existing review screen.

- [ ] **Step 1: Implement** — add a self-contained sibling component at the bottom of `CommunityReview.tsx` and render it after the existing `<div className="community-layout">…</div>`:

```tsx
function WritingResponseReview({filter,version}:{filter:string;version:number}){
 const [items,setItems]=useState<OwnResponse[]>([]),[selected,setSelected]=useState<OwnResponse|null>(null),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 useEffect(()=>{let active=true;setSelected(null);listResponseQueue(filter==='published'?'published':'pending').then(d=>{if(active)setItems(d)}).catch(e=>{if(active)setMessage(responseError(e))});return()=>{active=false}},[filter,version])
 async function decide(decision:'published'|'rejected'){if(!selected||busy)return;if(!window.confirm(decision==='published'?'اعتماد هذا الرأي ونشره تحت الكتابة؟':'رفض الرأي وحجبه إن كان منشورًا؟'))return;setBusy(true);try{await reviewResponse(selected.id,selected.revision,decision,note);setItems(v=>v.filter(r=>r.id!==selected.id));setSelected(null);setNote('');setMessage('حُفظ القرار وسُجّل في سجل المراجعة.')}catch(e){setMessage(responseError(e))}finally{setBusy(false)}}
 return <div className="community-layout"><aside><h3>آراء على الكتابات ({items.length})</h3>{items.map(r=><button className="submission-entry" disabled={busy} key={r.id} onClick={()=>{setSelected(r);setNote('')}}>{r.body.slice(0,80)}<small>{r.author_name} · {r.writing_id}</small></button>)}</aside><div>{selected?<><h3>رأي على <a href={`/writings/${encodeURIComponent(selected.writing_id)}`} target="_blank" rel="noopener noreferrer">{selected.writing_id} ↗</a></h3><p>الكاتب: {selected.author_name} · النسخة {selected.revision}</p><p className="preserve-lines">{selected.body}</p><label>ملاحظة القرار<textarea disabled={busy} maxLength={1000} value={note} onChange={e=>setNote(e.target.value)}/></label><div className="lab-actions">{selected.status==='pending'&&<button className="primary" disabled={busy} onClick={()=>void decide('published')}>اعتماد ونشر</button>}<button disabled={busy||note.trim().length<3} onClick={()=>void decide('rejected')}>{selected.status==='published'?'حجب':'رفض'}</button></div></>:<p>اختر رأيًا لمراجعته.</p>}<p role="status">{busy?'جارٍ تنفيذ العملية…':message}</p></div></div>
}
```

Add the import `import {listResponseQueue,reviewResponse,responseError,type OwnResponse} from '../lib/writing-responses'`, and render `<WritingResponseReview filter={filter} version={version}/>` right after the existing `community-layout` div.

- [ ] **Step 2: Verify**

Run: `npm run build && npm run lint`
Expected: PASS. (Behaviour of the RPCs is covered by Task 3; this is wiring.)

- [ ] **Step 3: Commit**

```bash
git add src/components/CommunityReview.tsx
git commit -m "feat(admin): review queue for reader opinions on writings"
```

---

### Task 6: `objection` assistant task

**Files:**
- Modify: `api/edit-assist.mjs` (header comment, new `stances` const, `tasks.objection`, `spec.output(data,payload)`), `src/lib/ai-assist.ts` (`AssistRequests`), `scripts/test-edit-assist.mjs` (append test)

**Interfaces:**
- Consumes: `SparringStyle` (Task 1).
- Produces: `requestAssist('objection',{title,text,style,turns:{role:'critic'|'owner';text:string}[]})` → `{objection:string;quote:string}`.

- [ ] **Step 1: Write the failing test** — append to `scripts/test-edit-assist.mjs`:

```js
await test('Edit assist: objection stays bounded and its quote is grounded in the writing',async()=>{
 const writing='الحرية أن تختار ما تريد. ومن لا يختار لا يعيش حقًا.'
 const payload={title:'الحرية',text:writing,style:'logic',turns:[]}
 const ok=await run({body:{task:'objection',payload},generate:async()=>({objection:'تفترض أن الاختيار وحده يصنع الحياة، لكنك لم تبيّن لماذا.',quote:'ومن لا يختار لا يعيش حقًا.'})})
 assert.equal(ok.statusCode,200);assert.equal(ok.data.data.quote,'ومن لا يختار لا يعيش حقًا.')
 const invented=await run({body:{task:'objection',payload},generate:async()=>({objection:'اعتراض طويل بما يكفي ليكون صالحًا هنا.',quote:'جملة غير موجودة'})})
 assert.equal(invented.statusCode,200);assert.equal(invented.data.data.quote,'')
 assert.equal((await run({body:{task:'objection',payload},generate:async()=>({objection:'<b>اعتراض</b> يحتوي وسومًا غير مقبولة هنا',quote:''})})).statusCode,502)
 assert.equal((await run({body:{task:'objection',payload},generate:async()=>({objection:'قصير',quote:''})})).statusCode,502)
 const turn={role:'critic',text:'اعتراض سابق'}
 assert.equal((await run({body:{task:'objection',payload:{...payload,turns:Array(6).fill(turn)}},generate:async()=>({objection:'اعتراض جديد على جوابك الأخير بوضوح.',quote:''})})).statusCode,200)
 for(const bad of [{...payload,style:'oracle'},{...payload,turns:Array(7).fill(turn)},{...payload,turns:[{role:'judge',text:'x'}]},{...payload,turns:[{...turn,extra:1}]},{...payload,turns:[{...turn,text:'ا'.repeat(4001)}]},{...payload,extra:1},{...payload,text:'قصير'}]){
  const r=await run({body:{task:'objection',payload:bad}});assert.equal(r.statusCode,400);assert.equal(r.calls,0)
 }
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `node scripts/test-edit-assist.mjs`
Expected: FAIL — status 400 instead of 200 (unknown task).

- [ ] **Step 3: Implement** — in `api/edit-assist.mjs`:

Header comment: change the second line to `// quiz drafts, English translation drafts and sparring objections. Every result is a suggestion the owner reviews before saving.`

After the `base` const add:

```js
const stances={
 logic:'بأسلوب المنطقي: ابحث عن مقدمة غير مسلّمة أو قفزة في الاستدلال أو تعميم بلا سند.',
 history:'بأسلوب المؤرّخ: ائتِ بمثال مضاد من التاريخ أو من تاريخ الأفكار، واذكره بعبارة عامة إن لم تكن متأكدًا من تفاصيله.',
 skeptic:'بأسلوب المتشكك: اسأل ما الدليل على هذه الفكرة، وما الذي يجعل الكاتب يغيّر رأيه.',
}
```

Add inside `tasks` after `quiz`:

```js
 // A private sparring partner: one objection per turn. Publication is the owner's separate choice.
 objection:{
  validate:p=>exactKeys(p,['title','text','style','turns'])&&str(p.title??'',300,0)&&str(p.text,MAX_TEXT,20)&&Object.hasOwn(stances,p.style)&&Array.isArray(p.turns)&&p.turns.length<=6&&p.turns.every(t=>t&&typeof t==='object'&&!Array.isArray(t)&&exactKeys(t,['role','text'])&&['critic','owner'].includes(t.role)&&str(t.text,4000)),
  system:p=>`${base} أنت محاور فلسفي منصف ${stances[p.style]} اقرأ الكتابة وما سبق من الحوار، ثم قدّم اعتراضًا واحدًا قويًا ومحددًا على أضعف نقطة لم يُجب عنها بعد، في فقرة واحدة من جملتين إلى خمس جمل. إن كان آخر دور للكاتب فرد على جوابه مباشرة ولا تكرر اعتراضًا سابقًا. لا تنسب أقوالًا إلى أشخاص حقيقيين ولا تختلق وقائع أو تواريخ. في quote ضع جملة قصيرة منقولة حرفيًا من نص الكتابة تعترض عليها، أو اتركها فارغة.`,
  schema:{type:S.OBJECT,properties:{objection:{type:S.STRING},quote:{type:S.STRING}},required:['objection','quote']},
  input:p=>({title:p.title??'',text:p.text,turns:p.turns}),
  check:d=>str(d.objection,2000,20)&&!markup.test(d.objection)&&typeof d.quote==='string'&&d.quote.length<=2000,
  output:(d,p)=>{const quote=d.quote.trim();return {objection:d.objection.trim(),quote:quote&&quote.length<=500&&p.text.includes(quote)?quote:''}},
  temperature:.7,
 },
```

In `createHandler` change `data:spec.output(data)` to `data:spec.output(data,payload)`.

In `src/lib/ai-assist.ts` add `import type {SparringStyle} from './exchange'` and inside `AssistRequests`:

```ts
 objection:{payload:{title:string;text:string;style:SparringStyle;turns:{role:'critic'|'owner';text:string}[]};result:{objection:string;quote:string}}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node scripts/test-edit-assist.mjs && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/edit-assist.mjs src/lib/ai-assist.ts scripts/test-edit-assist.mjs
git commit -m "feat(assist): owner-only sparring objection grounded in the writing"
```

---

### Task 7: Sparring client library

**Files:**
- Create: `src/lib/sparring.ts`
- Test: `scripts/test-dialogue.mjs`

**Interfaces:**
- Consumes: `requestAssist`, `ASSIST_MAX_BODY` (`src/lib/ai-assist.ts`); `MAX_ROUNDS`, `ExchangeRound`, `SparringStyle` (Task 1); `isStarterWriting` (`src/lib/publication.ts`); RPCs from Task 3.
- Produces: `type Turn`, `type SparringSession`, `MAX_TURNS=40`, `listSessions()`, `saveSession(s)`, `deleteSession(id)`, `objectionPayload(writing,style,turns)`, `nextObjection(writing,style,turns): Promise<Turn>`, `publishRound<T extends Content>(content:T,writingId,round,now?):T`, `untestedWritings(content,sessions): Writing[]`, `sparringError(e): string`.

- [ ] **Step 1: Write the failing test** — in `scripts/test-dialogue.mjs` change the content import to `const {initialContent,legacyContent,validContent}=…`, load `const {objectionPayload,publishRound,untestedWritings}=await server.ssrLoadModule('/src/lib/sparring.ts')`, then before `}finally`:

```js
 await test('Sparring helpers trim context to the request limit and publish rounds into the draft only',()=>{
  const turns=Array.from({length:9},(_,i)=>({role:i%2?'owner':'critic',text:'ا'.repeat(3000)+i,quote:'q'}))
  const payload=objectionPayload(writing,'logic',turns)
  assert.ok(payload.turns.length<=6)
  assert.ok(new TextEncoder().encode(JSON.stringify({task:'objection',payload})).byteLength<=30000)
  assert.equal(payload.turns.at(-1).text,turns.at(-1).text)
  assert.ok(payload.turns.every(t=>!('quote' in t)))
  const content={...initialContent,writings:[writing]}
  const next=publishRound(content,'dialogue',{style:'history',objection:round.objection,reply:'  جواب  '},new Date('2026-10-17T10:00:00Z'))
  assert.deepEqual(next.writings[0].exchange,[{style:'history',objection:round.objection,reply:'جواب',publishedAt:'2026-10-17T10:00:00.000Z'}])
  assert.equal(content.writings[0].exchange,undefined)
  assert.equal(validContent(next),true)
  assert.throws(()=>publishRound(withRounds(Array(5).fill(round)),'dialogue',{style:'logic',objection:round.objection,reply:'x'}),/٥/)
  assert.throws(()=>publishRound(content,'missing',{style:'logic',objection:round.objection,reply:'x'}))
  assert.deepEqual(untestedWritings(content,[]).map(w=>w.id),['dialogue'])
  assert.deepEqual(untestedWritings(content,[{writing_id:'dialogue'}]),[])
  assert.deepEqual(untestedWritings(legacyContent,[]),[]) // starter templates are never offered for sparring
 })
```

- [ ] **Step 2: Run to verify it fails**

Run: `node scripts/test-dialogue.mjs`
Expected: FAIL — cannot load `/src/lib/sparring.ts`.

- [ ] **Step 3: Implement** — create `src/lib/sparring.ts`:

```ts
import {supabase} from './cloud'
import {ASSIST_MAX_BODY,requestAssist} from './ai-assist'
import {communityError} from './community'
import {isStarterWriting} from './publication'
import {MAX_ROUNDS,type ExchangeRound,type SparringStyle} from './exchange'
import type {Content,Writing} from '../content'

export type Turn={role:'critic'|'owner';text:string;quote?:string}
export type SparringSession={id:string;writing_id:string;style:SparringStyle;turns:Turn[];revision:number;updated_at:string}
export const MAX_TURNS=40
const columns='id,writing_id,style,turns,revision,updated_at'

export function sparringError(error:unknown){
 if(error&&typeof error==='object'&&'code' in error)return communityError(error)
 if(error instanceof Error&&!/COMMUNITY_/.test(error.message))return error.message
 return communityError(error)
}
export async function listSessions(){
 const {data,error}=await supabase.from('kumeel_sparring').select(columns).order('updated_at',{ascending:false}).limit(200)
 if(error)throw error;return data as SparringSession[]
}
export async function saveSession(s:{id?:string;revision?:number;writing_id:string;style:SparringStyle;turns:Turn[]}){
 const {data,error}=await supabase.rpc('kumeel_save_sparring',{p_id:s.id??null,p_revision:s.revision??null,p_writing:s.writing_id,p_style:s.style,p_turns:s.turns})
 if(error)throw error;const result=Array.isArray(data)?data[0]:data
 if(!result?.id||!Number.isInteger(result.revision))throw new Error('تعذّر تأكيد حفظ الجلسة.')
 return result as SparringSession
}
export async function deleteSession(id:string){const {error}=await supabase.rpc('kumeel_delete_sparring',{p_id:id});if(error)throw error}

// Newest turns that fit the assistant's body limit; quotes stay local.
export function objectionPayload(writing:Pick<Writing,'title'|'text'>,style:SparringStyle,turns:Turn[]){
 let recent=turns.slice(-6).map(({role,text})=>({role,text}))
 const size=(t:typeof recent)=>new TextEncoder().encode(JSON.stringify({task:'objection',payload:{title:writing.title,text:writing.text,style,turns:t}})).byteLength
 while(recent.length&&size(recent)>ASSIST_MAX_BODY)recent=recent.slice(1)
 return {title:writing.title,text:writing.text,style,turns:recent}
}
export async function nextObjection(writing:Pick<Writing,'title'|'text'>,style:SparringStyle,turns:Turn[]):Promise<Turn>{
 const result=await requestAssist('objection',objectionPayload(writing,style,turns))
 return result.quote?{role:'critic',text:result.objection,quote:result.quote}:{role:'critic',text:result.objection}
}
// Copies one round into the draft; the public site changes only after the owner publishes.
export function publishRound<T extends Content>(content:T,writingId:string,round:Omit<ExchangeRound,'publishedAt'>,now=new Date()):T{
 const writing=content.writings.find(w=>w.id===writingId)
 if(!writing)throw new Error('لم تعد هذه الكتابة في المسودة.')
 const rounds=writing.exchange??[]
 if(rounds.length>=MAX_ROUNDS)throw new Error(`بلغت هذه الكتابة ${MAX_ROUNDS.toLocaleString('ar-SA')} جولات منشورة.`)
 const next:ExchangeRound={style:round.style,objection:round.objection,reply:round.reply.trim(),publishedAt:now.toISOString()}
 return {...content,writings:content.writings.map(w=>w.id===writingId?{...w,exchange:[...rounds,next]}:w)}
}
export function untestedWritings(content:Content,sessions:Pick<SparringSession,'writing_id'>[]){
 const tested=new Set(sessions.map(s=>s.writing_id))
 return content.writings.filter(w=>!isStarterWriting(w)&&!tested.has(w.id))
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node scripts/test-dialogue.mjs && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sparring.ts scripts/test-dialogue.mjs
git commit -m "feat(admin): sparring session storage and round publishing helpers"
```

---

### Task 8: «المحاور» admin tab and overview nudge

**Files:**
- Create: `src/components/admin/AdminSparring.tsx`
- Modify: `src/lib/admin.ts` (`AdminTab` union; `adminNav` المحتوى group), `src/components/AdminPanel.tsx` (import + render line next to `assist`), `src/components/admin/AdminOverview.tsx` (first child of `admin-overview`), `src/styles/admin.css` (append)

**Interfaces:**
- Consumes: everything from Task 7; `styleLabel`, `sparringStyles`, `MAX_ROUNDS` (Task 1); `OwnerDraft` from `src/lib/translations.ts`; `AdminTab`.
- Produces: `<AdminSparring content save/>`, `<SparringNudge content go/>`; tab key `'sparring'`.

- [ ] **Step 1: Wire the tab** — in `src/lib/admin.ts` add `'sparring'` to the `AdminTab` union, and in the `المحتوى` group after the `writings` item add:

```ts
  {key:'sparring',label:'المحاور',icon:'⚖',hint:'اختبر كتاباتك أمام اعتراض قوي، وانشر ما تختار',ownerOnly:true},
```

In `AdminPanel.tsx` import `{AdminSparring}` from `'./admin/AdminSparring'` and add after the `assist` line: `{tab==='sparring'&&authorized&&<AdminSparring content={content} save={commit}/>}`.

- [ ] **Step 2: Implement the component** — create `src/components/admin/AdminSparring.tsx`:

```tsx
import {useEffect,useMemo,useRef,useState} from 'react'
import type {OwnerDraft as Content} from '../../lib/translations'
import type {Content as SiteContent} from '../../content'
import type {AdminTab} from '../../lib/admin'
import {isStarterWriting} from '../../lib/publication'
import {MAX_ROUNDS,sparringStyles,styleLabel,type SparringStyle} from '../../lib/exchange'
import {MAX_TURNS,deleteSession,listSessions,nextObjection,publishRound,saveSession,sparringError,untestedWritings,type SparringSession,type Turn} from '../../lib/sparring'

const n=(v:number)=>v.toLocaleString('ar-SA')
const when=(iso:string)=>new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',timeStyle:'short',calendar:'gregory'}).format(new Date(iso))
const styleHint:Record<SparringStyle,string>={logic:'يبحث عن مقدمة غير مسلّمة أو قفزة في الاستدلال',history:'يأتي بمثال مضاد من التاريخ أو تاريخ الأفكار',skeptic:'يسأل: ما الدليل؟ وما الذي يغيّر رأيك؟'}

export function SparringNudge({content,go}:{content:SiteContent;go:(tab:AdminTab)=>void}){
 const [count,setCount]=useState<number|null>(null)
 useEffect(()=>{let active=true;listSessions().then(s=>{if(active)setCount(untestedWritings(content,s).length)}).catch(()=>{});return()=>{active=false}},[content])
 if(!count)return null
 return <section className="admin-card admin-sparring-nudge"><span className="admin-eyebrow">المحاور</span><p>{n(count)} كتابات لم تُختبر بعد.</p><button className="admin-btn is-primary" onClick={()=>go('sparring')}>ابدأ مبارزة</button></section>
}

export function AdminSparring({content,save}:{content:Content;save:(next:Content)=>boolean}){
 const writings=useMemo(()=>content.writings.filter(w=>!isStarterWriting(w)),[content.writings])
 const [writingId,setWritingId]=useState(writings[0]?.id??'')
 const [style,setStyle]=useState<SparringStyle>('logic')
 const [sessions,setSessions]=useState<SparringSession[]>([])
 const [session,setSession]=useState<SparringSession|null>(null)
 const [reply,setReply]=useState('')
 const [edits,setEdits]=useState<Record<number,string>>({})
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState({text:'',error:false})
 const mounted=useRef(true)
 useEffect(()=>()=>{mounted.current=false},[])
 useEffect(()=>{listSessions().then(s=>{if(mounted.current)setSessions(s)}).catch(e=>{if(mounted.current)setMessage({text:sparringError(e),error:true})})},[])
 const say=(text:string,error=false)=>{if(mounted.current)setMessage({text,error})}
 const writing=writings.find(w=>w.id===writingId)
 const published=writing?.exchange?.length??0
 const close=()=>{setSession(null);setReply('');setEdits({})}

 async function persist(next:{id?:string;revision?:number;writing_id:string;style:SparringStyle;turns:Turn[]}){
  const saved=await saveSession(next)
  if(mounted.current){setSession(saved);setSessions(list=>[saved,...list.filter(s=>s.id!==saved.id)])}
 }
 async function challenge(base:SparringSession|null){
  if(!writing||busy)return
  const turns=base?.turns??[]
  if(turns.length>=MAX_TURNS){say(`بلغ الحوار ${n(MAX_TURNS)} دورًا. ابدأ جلسة جديدة.`,true);return}
  const s=base?.style??style
  setBusy(true);say('')
  try{const critic=await nextObjection(writing,s,turns);await persist({id:base?.id,revision:base?.revision,writing_id:writing.id,style:s,turns:[...turns,critic]})}
  catch(e){say(sparringError(e),true)}
  finally{if(mounted.current)setBusy(false)}
 }
 async function answer(){
  if(!session||busy||!reply.trim())return
  setBusy(true);say('')
  try{await persist({...session,turns:[...session.turns,{role:'owner',text:reply.trim()}]});if(mounted.current)setReply('')}
  catch(e){say(sparringError(e),true)}
  finally{if(mounted.current)setBusy(false)}
 }
 function publish(i:number){
  if(!session||!writing)return
  const text=(edits[i]??session.turns[i].text).trim()
  if(!text){say('اكتب الجواب قبل النشر.',true);return}
  try{
   const next=publishRound(content,writing.id,{style:session.style,objection:session.turns[i-1].text,reply:text})
   if(save(next))say('أُضيفت الجولة إلى المسودة. انشرها للعموم من «النشر والحساب».')
   else say('تعذّر حفظ المسودة؛ راجع طول الجواب.',true)
  }catch(e){say(sparringError(e),true)}
 }
 async function remove(s:SparringSession){
  if(busy||!window.confirm('حذف هذه الجلسة الخاصة نهائيًا؟ الجولات المنشورة تبقى في الكتابة.'))return
  setBusy(true)
  try{await deleteSession(s.id);if(mounted.current)setSessions(l=>l.filter(x=>x.id!==s.id))}
  catch(e){say(sparringError(e),true)}
  finally{if(mounted.current)setBusy(false)}
 }

 if(!writings.length)return <section className="admin-card"><h2>المحاور</h2><p>أضف كتابة معتمدة أولًا ثم اختبرها هنا.</p></section>
 const own=sessions.filter(s=>s.writing_id===writingId)
 const last=session?session.turns[session.turns.length-1]:undefined
 return <section className="admin-card admin-sparring">
  <header><h2>المحاور</h2><p className="admin-muted">اختبر كتابتك أمام اعتراض قوي. الحوار خاص بك؛ لا يظهر للزوار إلا ما تنشره من جولات.</p></header>
  <label className="admin-field"><span className="admin-field-label">الكتابة</span><select disabled={busy} value={writingId} onChange={e=>{setWritingId(e.target.value);close()}}>{writings.map(w=><option key={w.id} value={w.id}>{w.title||w.id}</option>)}</select></label>
  <p className="admin-muted">جولات منشورة: {n(published)} من {n(MAX_ROUNDS)}</p>
  {!session&&<>
   <fieldset className="admin-field"><legend className="admin-field-label">اختر المحاور</legend>{sparringStyles.map(s=><label key={s} className="admin-check"><input type="radio" name="sparring-style" checked={style===s} onChange={()=>setStyle(s)}/> <b>{styleLabel[s]}</b> — {styleHint[s]}</label>)}</fieldset>
   <button className="admin-btn is-primary" disabled={busy||!writing} onClick={()=>void challenge(null)}>{busy?'المحاور يفكّر…':'ابدأ المبارزة'}</button>
   {own.length>0&&<><h3>جلسات سابقة</h3><ul className="admin-list">{own.map(s=><li key={s.id}><button className="admin-btn is-quiet" disabled={busy} onClick={()=>{setSession(s);setEdits({})}}>{styleLabel[s.style]} · {n(s.turns.length)} أدوار · {when(s.updated_at)}</button><button className="admin-btn is-danger" disabled={busy} onClick={()=>void remove(s)}>حذف</button></li>)}</ul></>}
  </>}
  {session&&<>
   <ol className="sparring-turns">{session.turns.map((t,i)=><li key={i} className={`is-${t.role}`}>
    <strong>{t.role==='critic'?`المحاور ${styleLabel[session.style]}`:'جوابك'}</strong>
    {t.quote&&<blockquote>«{t.quote}»</blockquote>}
    <p className="preserve-lines">{t.text}</p>
    {t.role==='owner'&&session.turns[i-1]?.role==='critic'&&<details><summary>انشر هذه الجولة</summary><label className="admin-field"><span className="admin-field-label">صياغة الجواب المنشور</span><textarea maxLength={4000} value={edits[i]??t.text} onChange={e=>setEdits(d=>({...d,[i]:e.target.value}))}/></label><button className="admin-btn" disabled={busy||published>=MAX_ROUNDS} onClick={()=>publish(i)}>أضف إلى المسودة</button>{published>=MAX_ROUNDS&&<small className="admin-muted"> بلغت الكتابة الحد الأقصى للجولات المنشورة.</small>}</details>}
   </li>)}</ol>
   {last?.role==='critic'
    ?<form onSubmit={e=>{e.preventDefault();void answer()}}><label className="admin-field"><span className="admin-field-label">جوابك</span><textarea required maxLength={4000} value={reply} disabled={busy} onChange={e=>setReply(e.target.value)}/></label><small className="admin-muted">{n(reply.length)} / {n(4000)}</small> <button className="admin-btn is-primary" disabled={busy||!reply.trim()}>احفظ جوابك</button></form>
    :<button className="admin-btn is-primary" disabled={busy} onClick={()=>void challenge(session)}>{busy?'المحاور يفكّر…':'اعترض مجددًا'}</button>}
   <div className="admin-sparring-actions"><button className="admin-btn" disabled={busy} onClick={close}>احفظ وأغلق</button><button className="admin-btn" disabled={busy} onClick={()=>{close();setStyle(s=>sparringStyles[(sparringStyles.indexOf(s)+1)%sparringStyles.length])}}>محاور آخر</button></div>
  </>}
  <p role="status" className={message.error?'admin-error':'admin-muted'}>{message.text}</p>
 </section>
}
```

In `AdminOverview.tsx` add the import `import {SparringNudge} from './AdminSparring'` and render `<SparringNudge content={content} go={go}/>` as the first child inside `<div className="admin-overview">`.

Append to `src/styles/admin.css`:

```css
.admin-sparring fieldset{border:0;padding:0;display:grid;gap:8px}
.sparring-turns{list-style:none;padding:0;display:grid;gap:14px;margin-block:18px}
.sparring-turns li{padding:14px 16px;border:1px solid var(--color-line);background:var(--color-sunken)}
.sparring-turns li.is-owner{background:transparent;border-inline-start:3px solid var(--color-text-muted)}
.sparring-turns blockquote{margin:8px 0;color:var(--color-text-muted);font-size:.9em}
.admin-sparring-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:14px}
.admin-sparring .admin-list li{display:flex;gap:8px;align-items:center}
```

- [ ] **Step 3: Verify**

Run: `npm run build && npm run lint && npm test`
Expected: PASS. Then `npm run dev`, open `/admin#sparring` as the local owner and check: the tab appears, selecting a writing and «ابدأ المبارزة» shows an error message (no provider/DB locally) rather than crashing, and the layout holds at 375px width.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminSparring.tsx src/lib/admin.ts src/components/AdminPanel.tsx src/components/admin/AdminOverview.tsx src/styles/admin.css
git commit -m "feat(admin): private sparring partner tab with round publishing"
```

---

### Task 9: Documentation and release gate

**Files:**
- Modify: `docs/community.md` (append section), `README.md` (one line under «المحتوى والصلاحيات»)

- [ ] **Step 1: Document** — append to `docs/community.md`:

```markdown
## آراء القراء والمحاور

نفّذ `supabase/writing-dialogue.sql` بعد `community.sql`. الملف إضافي وقابل لإعادة التنفيذ ولا يعدّل دوال المجتمع.

- الأعضاء ذوو البريد المؤكد يكتبون رأيهم أسفل الكتابة عبر `kumeel_send_writing_response`. الرأي يُقبل فقط لمعرّف كتابة موجود في النسخة المنشورة، ويشترك مع ردود المجتمع في حد ٢٠ يوميًا.
- المراجعة من «مراجعة المجتمع» ← «آراء على الكتابات» عبر `kumeel_review_writing_response`، وتُسجّل بنوع `writing_response`.
- «المحاور» في الإدارة يحفظ الجلسات الخاصة في `kumeel_sparring` (المالك فقط). «انشر هذه الجولة» يضيف الاعتراض والجواب إلى `exchange` في المسودة؛ لا يظهر شيء للعموم قبل النشر المعتاد. الجولات لا تؤثر في بصمة الترجمة ولا تظهر في الصفحات الإنجليزية.
- قبل الإطلاق: تأكد أن `kumeel_published.content->'writings'` يحمل معرّفات الكتابات المعتمدة نفسها التي يعرضها الموقع. إن كانت القوالب القديمة ما زالت محفوظة، انشر مرة من الإدارة.
```

Add to `README.md` under «المحتوى والصلاحيات»: `- آراء القراء على الكتابات والمحاور الخاص بالمالك: [docs/community.md](docs/community.md#آراء-القراء-والمحاور).`

- [ ] **Step 2: Full verification**

Run: `npm run verify`
Expected: lint, all tests, release test and `wrangler deploy --dry-run` pass. Paste the tail of the output in the hand-off.

- [ ] **Step 3: Commit**

```bash
git add docs/community.md README.md
git commit -m "docs: reader opinions and sparring partner setup"
```

- [ ] **Step 4: Hand off for owner approval (no action without it)**

Report to the owner, in Arabic, the pending live steps:
1. Run `supabase/writing-dialogue.sql` on project `jigypvbqiuakdatkzoul` (SQL Editor or `scripts/supabase-admin.py`).
2. Check the live published writing ids match the site; republish once from the admin if starter templates remain.
3. Deploy, then manually: write an opinion as a member, approve it, run one sparring round and publish it.
