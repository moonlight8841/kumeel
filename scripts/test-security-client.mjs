import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createServer} from 'vite'
const vite=await createServer({server:{middlewareMode:true},appType:'custom'})
try{
 const {authRequestFailure,cooldownRemaining}=await vite.ssrLoadModule('/src/lib/auth-feedback.ts')
 const {readOwnerDraft,writeOwnerDraft,clearOwnerDraft}=await vite.ssrLoadModule('/src/lib/draft-storage.ts')
 const {clearPrivateTabData}=await vite.ssrLoadModule('/src/lib/privacy.ts')
 const {safeChatHistory}=await vite.ssrLoadModule('/src/lib/chat-history.ts')
 await test('Auth feedback never calls a rejected mail request successful and cooldown uses elapsed time',()=>{
  assert.match(authRequestFailure({status:429,code:'over_email_send_rate_limit'},'mail').message,/حد الإرسال/)
  assert.match(authRequestFailure({status:400,code:'captcha_failed'},'mail').message,/التحقق/)
  assert.equal(authRequestFailure({status:400,message:'secret details'},'mail').message.includes('secret'),false)
  assert.equal(cooldownRemaining(61000,1000),60)
  assert.equal(cooldownRemaining(61000,62000),0)
 })
 await test('Owner drafts are isolated by account and cleared explicitly',()=>{
  const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}
  const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002'
  map.set('kumeel-journal-v1',JSON.stringify({private:'legacy'}))
  assert.equal(readOwnerDraft(a,storage),null)
  writeOwnerDraft(a,{private:'draft A'},storage)
  assert.equal(readOwnerDraft(b,storage),null)
  assert.deepEqual(readOwnerDraft(a,storage),{private:'draft A'})
  clearOwnerDraft(a,storage);assert.equal(readOwnerDraft(a,storage),null)
  assert.ok(map.has('kumeel-journal-v1'),'legacy draft is preserved without automatic import')
 })
 await test('Signout clears app private tab data without clearing unrelated storage or cooldowns',()=>{
  const map=new Map([['kumeel-owner-draft-v2:a','private'],['kumeel-notebook-buffer-v2:a','unsaved writing'],['kumeel-idea-engine-v2:a','notes'],['kumeel-reader-chat','chat'],['kumeel-reader-question','question'],['other-app','keep'],['kumeel-auth-cooldown:mail','deadline']])
  const storage={get length(){return map.size},key:i=>[...map.keys()][i],removeItem:k=>map.delete(k)}
  clearPrivateTabData(storage)
  assert.deepEqual([...map.keys()],['other-app','kumeel-auth-cooldown:mail'])
 })
 await test('Restored chat bounds messages and rejects executable/external source links',()=>{
  const history=safeChatHistory([{role:'model',text:'answer',sources:[{title:'bad',href:'javascript:alert(1)'},{title:'external',href:'https://evil.test'},{title:'good',href:'/writings/peace-and-conflict'}]}])
  assert.deepEqual(history[0].sources,[{title:'good',href:'/writings/peace-and-conflict'}])
  assert.deepEqual(safeChatHistory([{role:'system',text:'inject'},{role:'user',text:'x'.repeat(4000)}]),[])
 })
}finally{await vite.close()}
