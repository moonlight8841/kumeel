// Isolated PostgreSQL; same external PGlite dependency as test-community-db.mjs.
import {PGlite} from '../artifacts/community-db/node_modules/@electric-sql/pglite/dist/index.js'
import {readFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
const db=new PGlite()
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('session_id',current_setting('request.jwt.claim.session_id',true))$$;
 insert into auth.sessions values('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001',null),('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002',null),('10000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000003',null);
 create table public.kumeel_editors(user_id uuid primary key references auth.users(id));
 insert into auth.users values
 ('00000000-0000-4000-8000-000000000001','komeil9060@gmail.com',now()),
 ('00000000-0000-4000-8000-000000000002','bobmorgann2@gmail.com',null),
 ('00000000-0000-4000-8000-000000000003','visitor@example.com',now());
 grant usage on schema auth to authenticated;
 grant execute on function auth.uid() to authenticated;`)
 const activate=await readFile('supabase/activate-owner.sql','utf8')
 await db.exec(activate);await db.exec(activate)
 await db.exec(await readFile('supabase/pause-admin-mfa.sql','utf8'))
 const check=async n=>{
  await db.exec(`reset role;select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-${String(n).padStart(12,'0')}',false);select set_config('request.jwt.claim.session_id','10000000-0000-4000-8000-${String(n).padStart(12,'0')}',false);set role authenticated;`)
  return (await db.query('select public.kumeel_is_secure_editor() as allowed')).rows[0].allowed
 }
 assert.equal(await check(1),true,'original owner retains access')
 assert.equal(await check(2),false,'prepared membership never bypasses email verification')
 assert.equal(await check(3),false,'ordinary confirmed member is denied')
 await db.exec(`reset role;insert into public.kumeel_editors values('00000000-0000-4000-8000-000000000003');`)
 assert.equal(await check(3),false,'membership alone cannot bypass approved email restriction')
 await db.exec(`reset role;update auth.users set email_confirmed_at=now() where email='bobmorgann2@gmail.com';`)
 assert.equal(await check(2),true,'second owner gains access only after confirmation')
 await db.exec(`reset role;delete from public.kumeel_editors where user_id='00000000-0000-4000-8000-000000000002';`)
 assert.equal(await check(2),false,'removing membership revokes owner access')
 await db.exec('reset role;set role anon;')
 await assert.rejects(db.query('select public.kumeel_is_secure_editor()'),/permission denied/)
 console.log('Owner access: additive repeatable activation, both owners, confirmed email, membership revocation and anonymous denial passed.')
}finally{await db.close()}
