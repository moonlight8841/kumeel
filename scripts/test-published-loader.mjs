import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createPublishedLoader} from '../api/_shared/published-loader.mjs'
await test('Published cache revalidates revision, coalesces reads and isolates callers',async()=>{
 let revision=1,reads=0,checks=0
 const loader=createPublishedLoader({readRevision:async()=>{checks++;return revision},readSnapshot:async()=>{reads++;await new Promise(r=>setTimeout(r,5));return {revision,content:{text:`public-${revision}`,private:'removed'}}},prepare:async c=>({text:c.text})})
 const results=await Promise.all(Array.from({length:12},()=>loader()))
 assert.equal(reads,1);assert.equal(checks,1)
 assert.deepEqual(results[0].content,{text:'public-1'})
 results[0].content.text='mutated'
 assert.equal((await loader()).content.text,'public-1');assert.equal(reads,1);assert.equal(checks,2)
 revision=2
 assert.equal((await loader()).content.text,'public-2');assert.equal(reads,2)
 await loader({bypass:true});assert.equal(reads,3)
 assert.equal((await loader()).content.text,'public-2');assert.equal(reads,3)
})
await test('Published cache never serves stale or caches a failed read',async()=>{
 let fail=false,revision=1,reads=0
 const loader=createPublishedLoader({readRevision:async()=>{if(fail)throw Error('offline');return revision},readSnapshot:async()=>{reads++;if(fail)throw Error('offline');return {revision,content:{text:'public'}}},prepare:async c=>c})
 await loader();fail=true
 await assert.rejects(loader(),/offline/)
 fail=false;revision=2
 await loader();assert.equal(reads,2)
})
