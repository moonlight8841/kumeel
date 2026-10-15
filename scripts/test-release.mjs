import assert from 'node:assert/strict'
import {initialContent,legacyContent,readerContent,contentForPage} from '../dist-ssr/entry-server.js'
const edition=readerContent(initialContent)
assert.equal(edition.ideas.length,0)
assert.equal(edition.writings.length,3)
assert.deepEqual(readerContent(legacyContent).writings,edition.writings)
assert.deepEqual(readerContent({...legacyContent,writings:[{...legacyContent.writings[0],text:'نص عدّله المالك'}]}).writings[0].text,'نص عدّله المالك')
assert.equal(initialContent.ideas.length,3)
assert.equal(initialContent.writings.length,3)
assert.equal(contentForPage(initialContent,'/admin').writings.length,3)
const approved={id:'original',title:'عمل معتمد',category:'فلسفة',text:'كتابة أصلية معتمدة'}
assert.deepEqual(readerContent({...initialContent,writings:[approved]}).writings,[approved])
console.log('Reader edition excludes templates, preserves the owner notebook, and retains original work.')

if(process.env.WORKER_TEST_URL){
 const base=process.env.WORKER_TEST_URL
 for(const [path,status] of [['/',200],['/admin',200],['/writings',200],['/observatory',200],['/ideas/certainty',404],['/writings/meaning',404],['/missing-page',404],['/robots.txt',200],['/sitemap.xml',200],['/api/chat',200]]){
  const response=await fetch(base+path,{signal:AbortSignal.timeout(20000)})
  const body=await response.text()
  assert.equal(response.status,status,path)
  assert.equal(response.headers.get('x-content-type-options'),'nosniff')
  if(path==='/'){
   assert.ok(body.includes(initialContent.writings[0].text))
   assert.ok(!body.includes(initialContent.ideas[0].text))
   assert.ok(body.includes((process.env.WORKER_EXPECTED_ORIGIN||'https://kumeelalnahab.com')+'/'))
  }
  if(path==='/api/chat')assert.equal(JSON.parse(body).enabled,process.env.CHAT_EXPECTED_ENABLED==='true')
  if(path==='/sitemap.xml')assert.ok(!body.includes('/ideas/certainty'))
  console.log(`Workers runtime: ${status} ${path}`)
 }
 const unauth=await fetch(base+'/api/generate-idea',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})
 assert.equal(unauth.status,401)
 const oversized=await fetch(base+'/api/chat',{method:'POST',body:'x'.repeat(31000)})
 assert.equal(oversized.status,413)
 const head=await fetch(base+'/about',{method:'HEAD'})
 assert.equal(head.status,200)
 assert.equal(await head.text(),'')
 console.log('Workers runtime: unauthorized generation, body limit and HEAD semantics verified.')
}
