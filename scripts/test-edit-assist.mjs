import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHandler,mediaUrl,fetchImage} from '../api/edit-assist.mjs'

const owner={id:'owner-id',email:'komeil9060@gmail.com',email_confirmed_at:'2026-01-01'}
const authorization='Bearer '+Buffer.from('{"alg":"test"}').toString('base64url')+'.'+Buffer.from('{"aal":"aal2"}').toString('base64url')+'.test-signature'
const bucket='https://jigypvbqiuakdatkzoul.supabase.co/storage/v1/object/public/kumeel-media/'
const text='هذا نص للتدقيق اللغوي يحتوي على بعض الاخطاء البسيطة في الهمزات.'
const quizQuestion={title:'ما الفكرة؟',options:['أ','ب','ج','د'],answer:1,why:'لأن النص يقول ذلك.'}

async function run({method='POST',body={task:'proofread',payload:{text}},user=owner,member=true,key='k',generate=async()=>({corrected:text.replace('الاخطاء','الأخطاء'),notes:['همزة القطع']}),imageFetcher=async()=>({mimeType:'image/png',data:'AA=='}),headers={authorization},limits=new Map()}={}){
 let calls=0
 const fetcher=async url=>({ok:true,json:async()=>url.includes('/auth/')?user:member?[{user_id:owner.id}]:[]})
 const handler=createHandler({fetcher,env:{GEMINI_API_KEY:key},limits,imageFetcher,generate:async(...a)=>{calls++;return generate(...a)}})
 const result={headers:{},statusCode:0}
 await handler({method,body,headers},{setHeader:(k,v)=>result.headers[k]=v,status(c){result.statusCode=c;return this},json(d){result.data=d}})
 return {...result,calls}
}

await test('Edit assist: only the verified owner reaches the model',async()=>{
 assert.equal((await run({method:'GET'})).statusCode,405)
 assert.equal((await run({headers:{}})).statusCode,401)
 for(const user of [{...owner,email:'visitor@example.com'},{...owner,email_confirmed_at:null}]){const r=await run({user});assert.equal(r.statusCode,403);assert.equal(r.calls,0)}
 assert.equal((await run({member:false})).calls,0)
 assert.equal((await run({key:''})).statusCode,503)
})

await test('Edit assist: rejects unknown tasks, prototype keys and oversized or malformed input',async()=>{
 for(const body of [{task:'translate',payload:{text}},{task:'__proto__',payload:{text}},{task:'proofread',payload:{text:'x'.repeat(12001)}},{task:'proofread',payload:[]},{task:'quiz',payload:{text:'قصير'}},{task:'quiz',payload:{text:text.repeat(2),count:9}},'not-json']){
  const r=await run({body});assert.equal(r.statusCode,400);assert.equal(r.calls,0)
 }
})

await test('Edit assist: proofreading that rewrites the text is refused',async()=>{
 const good=await run();assert.equal(good.statusCode,200);assert.ok(good.data.data.corrected.includes('الأخطاء'))
 assert.equal((await run({generate:async()=>({corrected:'نص مختلف تمامًا',notes:[]})})).statusCode,502)
 assert.equal((await run({generate:async()=>({corrected:text+text,notes:[]})})).statusCode,502)
})
await test('Translation is owner-only, bounded, structured and never accepts publish metadata',async()=>{
 const payload={title:'سؤال',text:'لماذا نبحث؟',format:'plain',sourceLanguage:'ar',targetLanguage:'en'}
 const body={task:'translate',payload}
 const result=await run({body,generate:async()=>({title:'A question',text:'Why do we search?'})})
 assert.equal(result.statusCode,200);assert.deepEqual(result.data.data,{title:'A question',text:'Why do we search?'})
 const anonymous=await run({body,headers:{}});assert.equal(anonymous.statusCode,401);assert.equal(anonymous.calls,0)
 for(const bad of [{...payload,targetLanguage:'fr'},{...payload,text:'a'.repeat(12001)},{...payload,publish:true},{...payload,format:'html'}]){
  const r=await run({body:{task:'translate',payload:bad}});assert.equal(r.statusCode,400);assert.equal(r.calls,0)
 }
 assert.equal((await run({body:{task:'translate',payload:{...payload,text:'a'.repeat(12000)}},generate:async()=>({title:'A question',text:'Translated.'})})).statusCode,200)
 assert.equal((await run({body,key:''})).statusCode,503)
 for(const error of [Object.assign(new Error('busy'),{status:429}),Object.assign(new Error('timeout'),{name:'TimeoutError'}),new SyntaxError('Unexpected end of JSON input')]){
  const r=await run({body,generate:async()=>{throw error}});assert.ok(r.statusCode>=500||r.statusCode===429,String(r.statusCode));assert.equal(r.data.success,false);assert.equal(r.data.data,undefined)
 }
 assert.equal((await run({body:{task:'translate',payload:{...payload,title:''}},generate:async()=>({title:'',text:'Biography.'})})).statusCode,200)
 assert.equal((await run({body,generate:async()=>({title:'',text:'Untitled.'})})).statusCode,502)
 const markdown=await run({body:{task:'translate',payload:{...payload,format:'markdown',text:'## سؤال\n\n- أولًا'}},generate:async()=>({title:'Q',text:'## Question\n\n- First'})})
 assert.equal(markdown.data.data.text,'## Question\n\n- First')
 for(const invalid of [{title:'OK',text:''},{title:'OK',text:'x'.repeat(60001)},{title:'OK',text:'Text',approved:true},{title:'OK',text:'<script>alert(1)</script>'}])assert.equal((await run({body,generate:async()=>invalid})).statusCode,502)
})

await test('Edit assist: images are read only from the platform bucket',async()=>{
 assert.equal(mediaUrl(bucket+'a/photo.png'),true)
 for(const url of ['https://evil.example/kumeel-media/x.png',bucket.replace('kumeel-media','other')+'x.png',bucket+'%2e%2e/secret.png','https://user:pass@jigypvbqiuakdatkzoul.supabase.co/storage/v1/object/public/kumeel-media/x.png','javascript:alert(1)'])assert.equal(mediaUrl(url),false,url)
 assert.equal((await run({body:{task:'alt',payload:{imageUrl:'https://evil.example/x.png'}}})).statusCode,400)
 const failed=await run({body:{task:'alt',payload:{imageUrl:bucket+'x.png'}},imageFetcher:async()=>{throw Object.assign(new Error(),{code:'size'})}})
 assert.equal(failed.statusCode,422);assert.equal(failed.calls,0)
 const ok=await run({body:{task:'alt',payload:{imageUrl:bucket+'x.png',title:'كثبان'}},generate:async({image})=>{assert.equal(image.mimeType,'image/png');return {alt:'كثبان رملية عند الغروب'}}})
 assert.equal(ok.statusCode,200);assert.equal(ok.data.data.alt,'كثبان رملية عند الغروب')
})

await test('Edit assist: image fetching enforces type, size and no redirects',async()=>{
 const response=(type,length,size=10)=>async(_url,options)=>{assert.equal(options.redirect,'error');return {ok:true,headers:new Headers({'content-type':type,...(length?{'content-length':String(length)}:{})}),arrayBuffer:async()=>new ArrayBuffer(size)}}
 assert.equal((await fetchImage(bucket+'x.png',response('image/webp'))).mimeType,'image/webp')
 await assert.rejects(fetchImage(bucket+'x.svg',response('image/svg+xml')))
 await assert.rejects(fetchImage(bucket+'x.png',response('image/png',5_000_000)))
 await assert.rejects(fetchImage(bucket+'x.png',response('image/png',0,4_000_001)))
})

await test('Edit assist: quiz drafts must satisfy the content schema',async()=>{
 const body={task:'quiz',payload:{text:text.repeat(2),count:2}}
 assert.equal((await run({body,generate:async()=>({questions:[quizQuestion]})})).statusCode,200)
 for(const bad of [{...quizQuestion,answer:4},{...quizQuestion,options:['واحد']},{...quizQuestion,title:''}])assert.equal((await run({body,generate:async()=>({questions:[bad]})})).statusCode,502)
 assert.equal((await run({body,generate:async()=>({questions:[quizQuestion,quizQuestion,quizQuestion]})})).statusCode,502)
})

await test('Edit assist: cooldown and provider errors stay safe',async()=>{
 const limits=new Map()
 assert.equal((await run({limits})).statusCode,200)
 const again=await run({limits});assert.equal(again.statusCode,429);assert.equal(again.calls,0)
 const leak=await run({generate:async()=>{throw new Error('secret provider detail')}})
 assert.equal(leak.statusCode,502);assert.ok(!JSON.stringify(leak.data).includes('secret'))
 assert.equal((await run({generate:async()=>{throw Object.assign(new Error('x'),{status:429})}})).statusCode,429)
})
