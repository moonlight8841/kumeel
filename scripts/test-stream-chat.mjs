import assert from 'node:assert/strict'
import {createHmac} from 'node:crypto'
import {test} from 'node:test'
import {createHandler,cleanName,signJwt,MAJLIS,STREAM_BASE,VIDEO_BASE} from '../api/stream-chat.mjs'
import {MAJLIS_CALL,majlisCallType} from '../api/stream-video-config.mjs'

const env={STREAM_API_KEY:'testkey123',STREAM_API_SECRET:'test-secret-value'}
const member={id:'11111111-2222-3333-4444-555555555555',email:'reader@example.com',email_confirmed_at:'2026-01-01T00:00:00Z'}
const auth='Bearer '+'a'.repeat(40)
function respond(){const r={statusCode:0,headers:{},body:null,setHeader(k,v){this.headers[k]=v;return this},status(s){this.statusCode=s;return this},json(v){this.body=v;return this}};return r}
function fakeFetch({user=member,streamStatus=200}={}){
 const calls=[]
 const fetcher=async(url,init={})=>{
  calls.push({url,init})
  if(url.endsWith('/auth/v1/user'))return user?new Response(JSON.stringify(user),{status:200}):new Response('{}',{status:401})
  if(url.startsWith(STREAM_BASE)||url.startsWith(VIDEO_BASE))return new Response('{}',{status:streamStatus})
  throw new Error('unexpected '+url)
 }
 return {fetcher,calls}
}
const run=async(handler,req)=>{const res=respond();await handler({method:'POST',headers:{authorization:auth},body:JSON.stringify({name:'سارة'}),...req},res);return res}
const verify=(jwt,secret)=>{const [h,p,s]=jwt.split('.');assert.equal(createHmac('sha256',secret).update(`${h}.${p}`).digest('base64url'),s,'Signature matches the secret');return JSON.parse(Buffer.from(p,'base64url').toString())}

test('Stream chat: display names are bounded plain text',()=>{
 assert.equal(cleanName('  سارة   أحمد '),'سارة أحمد')
 for(const bad of ['','a','<b>x</b>','x'.repeat(41),'12345','name‎hidden',null,42])assert.equal(cleanName(bad),null,String(bad))
})

test('Stream chat: refuses without server configuration, POST or a signed-in confirmed member',async()=>{
 assert.equal((await run(createHandler({env:{},fetcher:fakeFetch().fetcher}))).statusCode,503)
 const res=respond();await createHandler({env,fetcher:fakeFetch().fetcher})({method:'GET',headers:{}},res);assert.equal(res.statusCode,405)
 assert.equal((await run(createHandler({env,fetcher:fakeFetch().fetcher}),{headers:{}})).statusCode,401)
 assert.equal((await run(createHandler({env,fetcher:fakeFetch({user:null}).fetcher}))).statusCode,401)
 const unconfirmed=fakeFetch({user:{...member,email_confirmed_at:null}})
 assert.equal((await run(createHandler({env,fetcher:unconfirmed.fetcher}))).statusCode,403)
 assert.ok(!unconfirmed.calls.some(c=>c.url.startsWith(STREAM_BASE)),'No Stream call before membership is proven')
 assert.equal((await run(createHandler({env,fetcher:fakeFetch().fetcher}),{body:JSON.stringify({name:'<x>'})})).statusCode,400)
})

test('Stream chat: issues a signed, expiring member token and adds the member to the majlis',async()=>{
 const {fetcher,calls}=fakeFetch()
 const res=await run(createHandler({env,fetcher,clock:()=>1_800_000_000_000,limits:new Map()}))
 assert.equal(res.statusCode,200)
 const {data}=res.body
 assert.deepEqual({apiKey:data.apiKey,userId:data.userId,name:data.name,channel:data.channel,call:data.call},{apiKey:env.STREAM_API_KEY,userId:member.id,name:'سارة',channel:{type:MAJLIS.type,id:MAJLIS.id},call:{...MAJLIS_CALL,host:false}})
 const claims=verify(data.token,env.STREAM_API_SECRET)
 assert.equal(claims.user_id,member.id);assert.equal(claims.exp,1_800_000_000+3600);assert.ok(claims.iat<1_800_000_000,'iat is back-dated against clock drift')
 assert.ok(!JSON.stringify(res.body).includes(env.STREAM_API_SECRET),'Secret never reaches the browser')
 const stream=calls.filter(c=>c.url.startsWith(STREAM_BASE)||c.url.startsWith(VIDEO_BASE))
 assert.deepEqual(stream.map(c=>new URL(c.url).pathname),['/users',`/channels/${MAJLIS.type}/${MAJLIS.id}/query`,`/api/v2/video/call/${MAJLIS_CALL.type}/${MAJLIS_CALL.id}`,`/channels/${MAJLIS.type}/${MAJLIS.id}`])
 assert.deepEqual(JSON.parse(stream[2].init.body),{data:{created_by_id:'kumeel'}},'The audio room is owned by the system user, never a member')
 for(const c of stream){assert.equal(new URL(c.url).searchParams.get('api_key'),env.STREAM_API_KEY);assert.equal(c.init.headers['Stream-Auth-Type'],'jwt');assert.equal(verify(c.init.headers.Authorization,env.STREAM_API_SECRET).server,true)}
 const users=JSON.parse(stream[0].init.body).users
 assert.deepEqual(users[member.id],{id:member.id,name:'سارة',role:'user'},'Members cannot pick their role and email is not shared')
 assert.deepEqual(JSON.parse(stream[3].init.body),{add_members:[{user_id:member.id}]})
})

test('Stream chat: the site owner is a room admin; attempts are rate limited; failures stay generic',async()=>{
 const {fetcher,calls}=fakeFetch({user:{...member,email:'Komeil9060@gmail.com'}})
 const owner=await run(createHandler({env,fetcher,limits:new Map()}))
 assert.equal(JSON.parse(calls.find(c=>c.url.includes('/users?')).init.body).users[member.id].role,'admin')
 assert.equal(owner.body.data.call.host,true,'Only the owner hosts the audio majlis')
 const limits=new Map(),handler=createHandler({env,fetcher:fakeFetch().fetcher,clock:()=>5_000,limits})
 for(let i=0;i<6;i++)assert.equal((await run(handler)).statusCode,200)
 assert.equal((await run(handler)).statusCode,429)
 const failed=await run(createHandler({env,fetcher:fakeFetch({streamStatus:500}).fetcher,limits:new Map()}))
 assert.equal(failed.statusCode,502);assert.ok(!JSON.stringify(failed.body).includes('test-secret'))
})

test('Stream chat: JWT helper produces standard HS256 tokens',async()=>{
 const jwt=await signJwt({user_id:'x'},'k')
 assert.deepEqual(JSON.parse(Buffer.from(jwt.split('.')[0],'base64url').toString()),{alg:'HS256',typ:'JWT'})
 verify(jwt,'k')
})

test('Stream video: the majlis call type keeps visitors out and members as listeners',()=>{
 const {grants,settings}=majlisCallType
 assert.deepEqual(grants.anonymous,[])
 for(const role of ['user','call_member']){
  assert.ok(grants[role].includes('join-call'))
  for(const forbidden of ['send-audio','create-call','update-call','join-backstage','mute-users','update-call-permissions'])assert.ok(!grants[role].includes(forbidden),`${role} cannot ${forbidden}`)
 }
 for(const needed of ['send-audio','join-backstage','update-call','update-call-permissions','mute-users'])assert.ok(grants.admin.includes(needed),`host can ${needed}`)
 assert.equal(settings.audio.access_request_enabled,true,'Members can raise a hand')
 assert.equal(settings.backstage.enabled,true,'Members wait until the host goes live')
 assert.equal(settings.video.enabled,false);assert.equal(settings.recording.mode,'disabled')
 assert.ok(settings.limits.max_duration_seconds<=4*3600)
})
