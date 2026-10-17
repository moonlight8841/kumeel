import assert from 'node:assert/strict'
import {test} from 'node:test'
import {verifyOwner,bodyTooLarge} from '../api/_shared/owner-ai.mjs'
import {takeOwnerQuota} from '../api/_shared/owner-quota.mjs'
import {createHandler} from '../api/edit-assist.mjs'
const authorization='Bearer '+'a'.repeat(35)
const user={id:'owner',email:'bobmorgann2@gmail.com',email_confirmed_at:'2026-10-17'}
const res=()=>({headers:{},statusCode:0,setHeader(k,v){this.headers[k]=v},status(c){this.statusCode=c;return this},json(data){this.data=data;return this}})
await test('Owner guard requires the database authorization result, not merely a valid Auth user',async()=>{
 for(const decision of [false,[],[{user_id:'owner'}],'true',null]){
  const result=await verifyOwner({authorization,fetcher:async url=>({ok:true,json:async()=>url.includes('/auth/')?user:decision})})
  assert.equal(result.status,403)
 }
 const allowed=await verifyOwner({authorization,fetcher:async url=>({ok:true,json:async()=>url.includes('/auth/')?user:true})})
 assert.equal(allowed.user.id,'owner')
})
await test('Owner AI fails closed on unavailable quotas and honors the database retry deadline',async()=>{
 let calls=0
 for(const state of [null,{allowed:false,retry_after:7,reason:'cooldown'},{allowed:false,retry_after:800,reason:'daily'}]){
  const handler=createHandler({env:{GEMINI_API_KEY:'test'},fetcher:async url=>({ok:true,json:async()=>url.includes('/auth/')?user:true}),quota:async()=>state,generate:async()=>{calls++;return {}}})
  const response=res();await handler({method:'POST',headers:{authorization},body:{task:'proofread',payload:{text:'نص عربي طويل بما يكفي لتدقيق اللغة.'}}},response)
  assert.equal(response.statusCode,state?429:503)
  if(state)assert.equal(response.headers['Retry-After'],String(state.retry_after))
 }
 assert.equal(calls,0)
 assert.equal(await takeOwnerQuota({actor:'owner',scope:'assist',env:{}}),null)
})
await test('Body size is measured in actual UTF-8 bytes even when Content-Length lies',()=>{
 assert.equal(bodyTooLarge({headers:{'content-length':'0'},body:{text:'ع'.repeat(3500)}},6000),true)
 assert.equal(bodyTooLarge({headers:{},body:'ع'.repeat(4)},8),false)
})
