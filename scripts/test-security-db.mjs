// Disposable PostgreSQL 17, no published ports or network. Requires Docker's cached postgres:17-alpine image.
import {spawn,execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const name=`kumeel-security-test-${Date.now()}`
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',c='00000000-0000-4000-8000-000000000003'
const sa='10000000-0000-4000-8000-000000000001',sb='10000000-0000-4000-8000-000000000002',sc='10000000-0000-4000-8000-000000000003'
const secret='q'.repeat(40)
function sql(query){return new Promise((resolve,reject)=>{const p=spawn('docker',['exec','-i',name,'psql','-U','postgres','-X','-At','-v','ON_ERROR_STOP=1']);let out='',err='';p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>err+=x);p.on('error',reject);p.on('exit',code=>code?reject(Error(err)):resolve(out.trim()));p.stdin.end(query)})}
const as=(role,user,session,query)=>sql(`select set_config('request.jwt.claim.sub','${user}',false);select set_config('request.jwt.claim.session_id','${session}',false);set role ${role};${query}`)
const last=text=>text.split('\n').at(-1)
try{
 execFileSync('docker',['run','--rm','--detach','--network','none','--name',name,'--env','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine'],{stdio:'pipe'})
 for(let i=0;i<60;i++){try{execFileSync('docker',['exec',name,'pg_isready','-U','postgres'],{stdio:'pipe'});break}catch{await new Promise(r=>setTimeout(r,250))}}
 await sql(`create role anon;create role authenticated;create schema auth;create schema extensions;create extension pgcrypto with schema extensions;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('session_id',current_setting('request.jwt.claim.session_id',true))$$;
 grant usage on schema auth to authenticated,anon;
 create table public.kumeel_editors(user_id uuid primary key references auth.users(id));
 alter table public.kumeel_editors enable row level security;grant select on public.kumeel_editors to authenticated;
 create policy own_editor on public.kumeel_editors for select to authenticated using(user_id=auth.uid());
 create table public.kumeel_published(id text primary key,revision integer,content jsonb);
 insert into auth.users values('${a}','komeil9060@gmail.com',now()),('${b}','bobmorgann2@gmail.com',now()),('${c}','visitor@example.com',now());
 insert into auth.sessions values('${sa}','${a}',null),('${sb}','${b}',null),('${sc}','${c}',null);
 insert into public.kumeel_editors values('${a}'),('${b}');
 insert into public.kumeel_published values('main',1,'{"writings":[{"id":"approved"}]}');`)
 for(const file of ['pause-admin-mfa.sql','community.sql','chat.sql','writing-dialogue.sql','teachers.sql','security-foundation.sql','security-foundation.sql'])await sql(readFileSync(`supabase/${file}`,'utf8'))
 await sql(`insert into kumeel_private.chat_settings(id,secret_hash) values(1,encode(extensions.digest('${secret}','sha256'),'hex'));`)
 for(const [user,session] of [[a,sa],[b,sb]])assert.equal(last(await as('authenticated',user,session,'select public.kumeel_is_secure_editor();')),'t')
 assert.equal(last(await as('authenticated',a,sb,'select public.kumeel_is_secure_editor();')),'f','session must belong to the claimed actor')
 await sql(`update auth.users set email_confirmed_at=null where id='${b}';`)
 assert.equal(last(await as('authenticated',b,sb,'select public.kumeel_is_secure_editor();')),'f')
 await sql(`update auth.users set email_confirmed_at=now() where id='${b}';update auth.sessions set not_after=now()-interval '1 second' where id='${sb}';`)
 assert.equal(last(await as('authenticated',b,sb,'select public.kumeel_is_secure_editor();')),'f')
 await sql(`update auth.sessions set not_after=null where id='${sb}';delete from auth.sessions where id='${sa}';`)
 assert.equal(last(await as('authenticated',a,sa,'select public.kumeel_is_secure_editor();')),'f','signed-out JWT cannot authorize owner operations')
 await sql(`insert into auth.sessions values('${sa}','${a}',null);`)
 await as('authenticated',c,sc,"select public.kumeel_send_writing_response('approved','قارئ اختبار','هذا رأي اختبار للتحقق من خصوصية الجلسات.');")
 await sql(`delete from auth.sessions where id='${sc}';`)
 assert.equal(last(await as('authenticated',c,sc,'select count(*) from public.kumeel_writing_responses;')),'0')
 await assert.rejects(as('authenticated',c,sc,"select public.kumeel_send_writing_response('approved','اختبار','هذا طلب من جلسة ملغاة ويجب رفضه.');"),/COMMUNITY_AUTH/)
 const take=(scope='assist',key=secret,actor=a)=>as('anon','','',`select public.kumeel_owner_ai_take('${key}','${actor}','${scope}');`).then(x=>JSON.parse(last(x)))
 const burst=await Promise.all(Array.from({length:12},()=>take()))
 assert.equal(burst.filter(r=>r.allowed).length,1,'twelve database connections may spend only one cooldown admission')
 assert.ok(burst.filter(r=>!r.allowed).every(r=>r.reason==='cooldown'&&r.retry_after>=1&&r.retry_after<=8))
 assert.equal(last(await sql(`select used from kumeel_private.owner_ai_quota where actor='${a}' and scope='assist';`)),'1')
 await assert.rejects(take('assist','wrong-secret'),/QUOTA_FORBIDDEN/)
 await assert.rejects(take('assist',secret,c),/QUOTA_FORBIDDEN/)
 await sql(`update kumeel_private.owner_ai_quota set used=120,last_request=now()-interval '1 hour' where actor='${a}' and scope='assist';`)
 const daily=await take();assert.equal(daily.reason,'daily');assert.ok(daily.retry_after>0&&daily.retry_after<=86400)
 const riyadhReset=Math.ceil((86400000-((Date.now()+3*3600000)%86400000))/1000);assert.ok(Math.abs(daily.retry_after-riyadhReset)<=2,'daily Retry-After points to midnight in Riyadh')
 assert.equal((await take('idea')).allowed,true,'idea and assist budgets are independent')
 await assert.rejects(as('authenticated',a,sa,'select * from kumeel_private.owner_ai_quota;'),/permission denied/)
 if(process.env.SECURITY_ROLLBACK_SQL){await sql(readFileSync(process.env.SECURITY_ROLLBACK_SQL,'utf8'));console.log('Narrow live-definition rollback rehearsed in isolated PostgreSQL.')}
 console.log('Security DB: repeatable SQL, both owners, verified emails, active/revoked/expired sessions, private RLS, failed writes, 12-connection quota atomicity, daily budgets and secret isolation passed.')
}finally{try{execFileSync('docker',['rm','--force',name],{stdio:'pipe'})}catch{/* Container may already have exited. */}}
