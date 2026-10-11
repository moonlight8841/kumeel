import assert from 'node:assert/strict'
import {createHandler} from '../api/generate-idea.mjs'
const owner={id:'owner-id',email:'komeil9060@gmail.com',email_confirmed_at:'2026-01-01'}
const output={title:'Idea',text:'Reasoning',question:'Why?',counterpoint:'Another view'}
const authorization='Bearer '+ 'a'.repeat(35)
async function run({method='POST',body={topic:'Certainty',method:'concept'},user=owner,member=true,key='test-key',generate=async()=>output,headers={authorization},limits=new Map()}={}){
 let calls=0;const fetcher=async url=>({ok:true,json:async()=>url.includes('/auth/')?user:member?[{user_id:owner.id}]:[]})
 const handler=createHandler({fetcher,env:{GEMINI_API_KEY:key},limits,generate:async(...args)=>{calls++;return generate(...args)}})
 const result={headers:{},statusCode:0};const res={setHeader:(k,v)=>result.headers[k]=v,status(code){result.statusCode=code;return this},json(data){result.data=data;return result}}
 await handler({method,body,headers},res);return {...result,calls}
}
assert.equal((await run({method:'GET'})).statusCode,405)
assert.equal((await run({headers:{}})).statusCode,401)
for(const user of [{...owner,email:'visitor@example.com'},{...owner,email_confirmed_at:null}]){const result=await run({user});assert.equal(result.statusCode,403);assert.equal(result.calls,0)}
assert.equal((await run({member:false})).statusCode,403)
assert.equal((await run({body:{topic:'x'.repeat(1001)}})).statusCode,400)
assert.equal((await run({body:'invalid-json'})).statusCode,400)
assert.equal((await run({key:''})).statusCode,503)
assert.equal((await run({generate:async()=>({title:'Incomplete'})})).statusCode,502)
assert.equal((await run({generate:async()=>{throw Error('secret provider details')}})).data.error.includes('secret'),false)
const good=await run();assert.equal(good.statusCode,200);assert.deepEqual(good.data.data,output)
const limits=new Map();assert.equal((await run({limits})).statusCode,200);assert.equal((await run({limits})).statusCode,429)
console.log('Gemini API: owner authorization, validation, unavailable key, malformed output, error redaction and cooldown passed; no provider request sent.')
