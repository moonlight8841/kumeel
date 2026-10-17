import assert from 'node:assert/strict'
import {test} from 'node:test'
import {handleAuth} from '../api/_shared/auth-bff.mjs'
import {handleBackend,ownerBrowserRequest} from '../api/_shared/backend-bff.mjs'
const origin='https://kumeelalnahab.com'
const user={id:'10000000-0000-4000-8000-000000000001',email:'fixture@example.com',email_confirmed_at:'2026-01-01',aud:'authenticated',app_metadata:{},user_metadata:{},factors:[]}
function jwt(exp=Math.floor(Date.now()/1000)+3600,aal='aal1'){return [Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,exp,iat:Math.floor(Date.now()/1000),session_id:'fixture-session',aal})).toString('base64url'),Buffer.from('fixture-signature').toString('base64url')].join('.')}
const token=jwt(),refresh='fixture-private-refresh-token'
function cookieJar(response,previous=''){
 const jar=new Map(previous.split('; ').filter(Boolean).map(x=>x.split('=')))
 for(const raw of response.headers.getSetCookie()){const pair=raw.split(';')[0],at=pair.indexOf('=');jar.set(pair.slice(0,at),pair.slice(at+1))}
 return [...jar].map(([k,v])=>`${k}=${v}`).join('; ')
}
const authRequest=(action,args={},cookie='',extra={})=>new Request(origin+'/api/auth',{method:'POST',headers:{Origin:origin,'X-Kumeel-BFF':'1','Content-Type':'application/json',Cookie:cookie,...extra},body:JSON.stringify({action,args})})
function provider(){
 const calls=[];let active=true,mailLimited=false
 const fetcher=async(input,init)=>{
  const url=new URL(input instanceof Request?input.url:String(input));const headers=new Headers(init?.headers)
  calls.push({url,headers,body:init?.body})
  if(url.pathname==='/auth/v1/token')return Response.json({access_token:token,refresh_token:refresh,expires_in:3600,token_type:'bearer',user})
  if(url.pathname==='/auth/v1/user')return Response.json(user)
  if(url.pathname.endsWith('/rpc/kumeel_has_active_session'))return Response.json(active)
  if(url.pathname.endsWith('/rpc/kumeel_is_secure_editor'))return Response.json(false)
  if(url.pathname==='/auth/v1/logout'){active=false;return new Response(null,{status:204})}
  if(url.pathname==='/auth/v1/otp')return mailLimited?Response.json({error_code:'over_email_send_rate_limit',msg:'PRIVATE PROVIDER DETAILS'},{status:429}):Response.json({})
  if(url.pathname.endsWith('/challenge'))return Response.json({id:'challenge-id',expires_at:Math.floor(Date.now()/1000)+60})
  if(url.pathname.endsWith('/verify'))return Response.json({access_token:jwt(undefined,'aal2'),refresh_token:refresh+'-mfa',expires_in:3600,token_type:'bearer',user})
  if(url.pathname.startsWith('/rest/v1/'))return Response.json([{id:'private-record'}])
  throw Error('Unexpected fixture upstream '+url.pathname)
 }
 return {fetcher,calls,setActive(value){active=value},setMailLimited(){mailLimited=true}}
}
await test('HttpOnly cookies hold credentials; JSON carries only verified profile; logout revokes old cookies',async()=>{
 const fixture=provider(),response=await handleAuth(authRequest('signInWithPassword',{email:user.email,password:'fixture-password'}),fixture)
 assert.equal(response.status,200)
 const text=await response.text();assert.ok(!text.includes(token));assert.ok(!text.includes(refresh));assert.equal(JSON.parse(text).data.session.user.id,user.id)
 assert.equal(response.headers.getSetCookie().length,2)
 for(const cookie of response.headers.getSetCookie()){assert.match(cookie,/^__Host-/);assert.match(cookie,/; HttpOnly/);assert.match(cookie,/; Secure/);assert.match(cookie,/; SameSite=Lax/);assert.doesNotMatch(cookie,/Domain=/i)}
 assert.match(response.headers.get('Cache-Control'),/no-store/)
 const jar=cookieJar(response)
 const session=await handleAuth(authRequest('session',{},jar),fixture);assert.equal((await session.json()).data.session.user.id,user.id)
 const out=await handleAuth(authRequest('signOut',{scope:'global'},jar),fixture);assert.equal(out.status,200);assert.ok(out.headers.getSetCookie().every(x=>x.includes('Max-Age=0')))
 const revoked=await handleAuth(authRequest('session',{},jar),fixture);assert.equal((await revoked.json()).data.session,null)
})
await test('CSRF gates prevent login, logout, database reads and AI requests before touching upstream',async()=>{
 const fixture=provider()
 for(const headers of [{Origin:'https://evil.example'},{'X-Kumeel-BFF':''},{'Sec-Fetch-Site':'cross-site'}])assert.equal((await handleAuth(authRequest('signInWithPassword',{},'',headers),fixture)).status,403)
 const bad=new Request(origin+'/api/backend?path=/rest/v1/kumeel_drafts',{headers:{Cookie:'anything'}})
 assert.equal((await handleBackend(bad,fixture)).status,403)
 let aiCalled=false;assert.equal((await ownerBrowserRequest(authRequest('unused',{},'',{Origin:'https://evil.example'}),()=>{aiCalled=true},fixture)).status,403)
 assert.equal(aiCalled,false);assert.equal(fixture.calls.length,0)
})
await test('Backend proxy fixes upstream, preserves RLS identity and encoded filters, disallows token/admin RPCs',async()=>{
 const fixture=provider(),signed=await handleAuth(authRequest('signInWithPassword',{email:user.email,password:'fixture-password'}),fixture),jar=cookieJar(signed)
 const request=path=>new Request(origin+'/api/backend?path='+encodeURIComponent(path),{headers:{'X-Kumeel-BFF':'1',Cookie:jar,Authorization:'Bearer attacker','Accept-Profile':'private'}})
 const response=await handleBackend(request('/rest/v1/kumeel_drafts?select=content%2Crevision'),fixture)
 assert.equal(response.status,200);const last=fixture.calls.at(-1);assert.equal(last.headers.get('Authorization'),'Bearer '+token);assert.equal(last.headers.get('accept-profile'),null);assert.equal(last.url.search,'?select=content%2Crevision')
 for(const path of ['/auth/v1/user','/rest/v1/rpc/kumeel_owner_ai_take','//evil.example/steal','/storage/v1/object/other/file','/rest/v1/%2e%2e/auth'])assert.ok((await handleBackend(request(path),fixture)).status>=400)
 fixture.setActive(false);assert.equal((await handleBackend(request('/rest/v1/kumeel_drafts'),fixture)).status,401)
 const publicRead=new Request(origin+'/api/backend?path=/rest/v1/kumeel_published',{headers:{'X-Kumeel-BFF':'1'}});assert.equal((await handleBackend(publicRead,fixture)).status,200)
})
await test('PKCE verifier stays HttpOnly; exchange and optional MFA never return provider tokens; mail quota stays honest',async()=>{
 const fixture=provider()
 const mail=await handleAuth(authRequest('signInWithOtp',{email:user.email,options:{emailRedirectTo:'https://evil.example'}}),fixture)
 assert.equal(mail.status,200);assert.match(mail.headers.getSetCookie().join(' '),/__Host-kumeel-pkce=.*HttpOnly/)
 const sent=JSON.parse(fixture.calls.at(-1).body);assert.equal(sent.create_user,false);assert.ok(sent.code_challenge)
 assert.equal(fixture.calls.at(-1).url.searchParams.get('redirect_to'),origin+'/admin')
 const exchanged=await handleAuth(authRequest('exchange',{code:'fixture-code'},cookieJar(mail)),fixture);assert.equal(exchanged.status,200);assert.doesNotMatch(await exchanged.text(),/access_token|refresh_token/)
 const verified=await handleAuth(authRequest('challengeAndVerify',{factorId:'20000000-0000-4000-8000-000000000001',code:'123456'},cookieJar(exchanged)),fixture);assert.equal(verified.status,200);assert.doesNotMatch(await verified.text(),/access_token|refresh_token/)
 fixture.setMailLimited();const limited=await handleAuth(authRequest('signInWithOtp',{email:user.email}),fixture);assert.equal(limited.status,429);const failure=await limited.text();assert.match(failure,/over_email_send_rate_limit/);assert.doesNotMatch(failure,/PRIVATE PROVIDER DETAILS/)
})
await test('Expired access is refreshed server-side and rotated credentials stay out of JSON',async()=>{
 const fixture=provider(),old=jwt(Math.floor(Date.now()/1000)-1)
 const jar=`__Host-kumeel-access=${old}; __Host-kumeel-refresh=${refresh}`
 const response=await handleAuth(authRequest('session',{},jar),fixture);assert.equal(response.status,200)
 assert.equal((await response.json()).data.session.user.id,user.id)
 assert.ok(fixture.calls.some(x=>x.url.searchParams.get('grant_type')==='refresh_token'))
 assert.ok(response.headers.getSetCookie().some(x=>x.includes(token)))
})
await test('Read and AI requests never rotate cookies, so slow responses cannot restore credentials after logout',async()=>{
 const fixture=provider(),old=jwt(Math.floor(Date.now()/1000)-1)
 const request=new Request(origin+'/api/backend?path=/rest/v1/kumeel_drafts',{headers:{'X-Kumeel-BFF':'1',Cookie:`__Host-kumeel-access=${old}; __Host-kumeel-refresh=${refresh}`}})
 const response=await handleBackend(request,fixture)
 assert.equal(response.status,401);assert.equal(response.headers.getSetCookie().length,0);assert.equal(fixture.calls.length,0)
 const fresh=jwt(),allowed=new Request(origin+'/api/backend?path=/rest/v1/kumeel_drafts',{headers:{'X-Kumeel-BFF':'1',Cookie:`__Host-kumeel-access=${fresh}; __Host-kumeel-refresh=${refresh}`}})
 const read=await handleBackend(allowed,fixture);assert.equal(read.status,200);assert.equal(read.headers.getSetCookie().length,0)
})
await test('Concurrent request contexts cannot leak one user profile to another',async()=>{
 const second={...user,id:'30000000-0000-4000-8000-000000000001',email:'second-fixture@example.com'}
 const token2=token.replace(token.split('.')[1],Buffer.from(JSON.stringify({sub:second.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'))
 const fetcher=async(input,init)=>new URL(String(input)).pathname.endsWith('/user')?Response.json(new Headers(init.headers).get('Authorization')==='Bearer '+token2?second:user):Response.json(true)
 const requests=[token,token2].map(access=>handleAuth(authRequest('session',{},`__Host-kumeel-access=${access}; __Host-kumeel-refresh=${refresh}`),{fetcher}))
 const results=await Promise.all(requests);assert.deepEqual(await Promise.all(results.map(async r=>(await r.json()).data.session.user.id)),[user.id,second.id])
})
await test('Media upload streams to the fixed bucket only after owner authorization',async()=>{
 const fixture=provider(),jar=`__Host-kumeel-access=${token}; __Host-kumeel-refresh=${refresh}`
 const path='/storage/v1/object/kumeel-media/40000000-0000-4000-8000-000000000001.jpg'
 const request=()=>new Request(origin+'/api/backend?path='+encodeURIComponent(path),{method:'POST',headers:{Origin:origin,'X-Kumeel-BFF':'1',Cookie:jar,'Content-Type':'image/jpeg'},body:new Uint8Array([1,2,3,4])})
 assert.equal((await handleBackend(request(),fixture)).status,403)
 let uploaded=false
 const fetcher=async(input,init)=>{
  const url=new URL(String(input))
  if(url.pathname.endsWith('/rpc/kumeel_is_secure_editor'))return Response.json(true)
  if(url.pathname===path){assert.equal(new Headers(init.headers).get('Authorization'),'Bearer '+token);assert.deepEqual([...new Uint8Array(await new Response(init.body).arrayBuffer())],[1,2,3,4]);uploaded=true;return Response.json({Key:'kumeel-media/fixture.jpg'})}
  return fixture.fetcher(input,init)
 }
 assert.equal((await handleBackend(request(),{fetcher})).status,200);assert.equal(uploaded,true)
})
await test('Node adapter preserves separate cookies and never caches a personalized response',async()=>{
 const {sendWebResponse}=await import('../api/_shared/node-bff.mjs')
 const headers=new Headers({'Cache-Control':'private, no-store'});headers.append('Set-Cookie','__Host-one=a; HttpOnly; Secure; Path=/');headers.append('Set-Cookie','__Host-two=b; HttpOnly; Secure; Path=/')
 const captured=new Map();let ended=false
 const res={setHeader(k,v){captured.set(k.toLowerCase(),v)},end(){ended=true}}
 await sendWebResponse(new Response('{}',{headers}),res)
 assert.equal(captured.get('set-cookie').length,2);assert.match(captured.get('cache-control'),/no-store/);assert.equal(ended,true)
})
await test('Gateway does not follow an upstream redirect with the user credential',async()=>{
 const fixture=provider();let redirects=0
 const fetcher=async(input,init)=>{
  assert.equal(init.redirect,'manual')
  if(new URL(String(input)).pathname==='/rest/v1/kumeel_drafts'){redirects++;return new Response(null,{status:307,headers:{Location:'https://evil.example/steal'}})}
  return fixture.fetcher(input,init)
 }
 const request=new Request(origin+'/api/backend?path=/rest/v1/kumeel_drafts',{headers:{'X-Kumeel-BFF':'1',Cookie:`__Host-kumeel-access=${token}; __Host-kumeel-refresh=${refresh}`}})
 const response=await handleBackend(request,{fetcher});assert.equal(response.status,503);assert.equal(response.headers.get('Location'),null);assert.equal(redirects,1)
})
