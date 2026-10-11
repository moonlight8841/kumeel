// Isolated PostgreSQL engine; install test dependency outside the production app:
// npm install --prefix artifacts/community-db @electric-sql/pglite@0.5.8 --ignore-scripts
import {PGlite} from '../artifacts/community-db/node_modules/@electric-sql/pglite/dist/index.js'
import {readFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
const db=new PGlite()
const owner='00000000-0000-4000-8000-000000000001',alice='00000000-0000-4000-8000-000000000002',bob='00000000-0000-4000-8000-000000000003',unconfirmed='00000000-0000-4000-8000-000000000004'
await db.exec(`create role anon;create role authenticated;create schema auth;grant usage on schema auth to anon,authenticated;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function public.kumeel_is_secure_editor() returns boolean language sql stable security definer set search_path='' as $$select auth.uid()='${owner}'::uuid$$;
 insert into auth.users values('${owner}',now()),('${alice}',now()),('${bob}',now()),('${unconfirmed}',null);`)
const setup=await readFile('supabase/community.sql','utf8');await db.exec(setup);await db.exec(setup)
async function as(role,id=''){await db.exec(`reset role;set role ${role};`);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id])}
const save=(id=null,revision=null,submit=false,rights=true)=>db.query('select * from public.kumeel_save_submission($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,revision,'Alice','A careful claim','This is a considered argument with an honest counterargument and a testable premise. '.repeat(2),'فلسفة','Source',false,submit,rights])
const decide=(kind,id,rev,decision,note='')=>db.query('select public.kumeel_review_community($1,$2,$3,$4,$5)',[kind,id,rev,decision,note])
const count=async table=>(await db.query(`select count(*)::integer as n from public.${table}`)).rows[0].n
await as('anon');assert.equal(await count('kumeel_community_posts'),0);await assert.rejects(save(),/permission denied/);await assert.rejects(db.query('select * from public.kumeel_submissions'),/permission denied/)
await as('authenticated',unconfirmed);await assert.rejects(save(),/COMMUNITY_AUTH/)
await as('authenticated',alice);await assert.rejects(save(null,null,true,false),/COMMUNITY_CONTENT/)
const draft=(await save()).rows[0];assert.equal(draft.status,'draft');assert.equal(await count('kumeel_submissions'),1)
await assert.rejects(db.query("update public.kumeel_submissions set status='published'"),/permission denied/)
await assert.rejects(db.query("insert into public.kumeel_community_posts(id,author_name,title,body,category,sources,assisted) values(gen_random_uuid(),'Fake','Fake','Fake','فلسفة','',false)"),/permission denied/)
await as('authenticated',bob);assert.equal(await count('kumeel_submissions'),0);await assert.rejects(save(draft.id,1),/COMMUNITY_FORBIDDEN/);await assert.rejects(decide('post',draft.id,1,'published'),/COMMUNITY_FORBIDDEN/)
await as('authenticated',alice);const pending=(await save(draft.id,1,true)).rows[0];assert.equal(pending.revision,2);await assert.rejects(save(draft.id,1),/COMMUNITY_CONFLICT/);await assert.rejects(save(draft.id,2),/COMMUNITY_LOCKED/)
await as('anon');assert.equal(await count('kumeel_community_posts'),0)
await as('authenticated',owner);assert.equal(await count('kumeel_submissions'),1);await assert.rejects(decide('post',draft.id,1,'published'),/COMMUNITY_CONFLICT/);await decide('post',draft.id,2,'published')
await as('anon');assert.equal(await count('kumeel_community_posts'),1);const post=(await db.query('select * from public.kumeel_community_posts')).rows[0];assert.ok(!('author_id' in post));assert.ok(!('review_note' in post))
await as('authenticated',alice);await assert.rejects(save(draft.id,3),/COMMUNITY_LOCKED/)
const reply=(await db.query('select public.kumeel_send_comment($1,$2,$3) as id',[draft.id,'Alice','A fair and thoughtful response'])).rows[0].id
await as('anon');assert.equal(await count('kumeel_public_comments'),0)
await as('authenticated',bob);assert.equal(await count('kumeel_community_comments'),0)
await as('authenticated',owner);await decide('comment',reply,1,'published');assert.equal(await count('kumeel_review_log'),2)
await as('anon');assert.equal(await count('kumeel_public_comments'),1)
await as('authenticated',owner);await assert.rejects(decide('post',draft.id,3,'changes_requested'),/COMMUNITY_NOTE_REQUIRED/);await decide('post',draft.id,3,'changes_requested','Please clarify the premise')
await as('anon');assert.equal(await count('kumeel_community_posts'),0);assert.equal(await count('kumeel_public_comments'),0)
await as('authenticated',alice);const revised=(await save(draft.id,4,true)).rows[0];assert.equal(revised.revision,5);assert.equal(revised.review_note,'Please clarify the premise')
await as('authenticated',owner);await decide('post',draft.id,5,'published');assert.equal(await count('kumeel_public_comments'),0);await assert.rejects(decide('comment',reply,2,'published'),/COMMUNITY_CONFLICT/);await decide('comment',reply,3,'published')
await as('authenticated',bob);await assert.rejects(db.query('select * from kumeel_private.community_quota'),/permission denied/)
for(let i=0;i<5;i++)await save();await assert.rejects(save(),/COMMUNITY_LIMIT/)
for(let i=0;i<20;i++)await db.query('select public.kumeel_send_comment($1,$2,$3)',[draft.id,'Bob','Thoughtful response number '+i]);await assert.rejects(db.query('select public.kumeel_send_comment($1,$2,$3)',[draft.id,'Bob','The twenty first response']),/COMMUNITY_LIMIT/)
await as('authenticated',bob);assert.equal(await count('kumeel_review_log'),0)
await db.close();console.log('Community database: repeatable setup, role permissions, privacy, moderation, optimistic locking, withdrawal, republication and daily limits passed.')
