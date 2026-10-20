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
 for(const [path,status] of [['/',200],['/admin',200],['/writings',200],['/observatory',200],['/ideas/certainty',404],['/writings/meaning',404],['/missing-page',404],['/robots.txt',200],['/sitemap.xml',200],['/llms.txt',200],['/api/chat',200]]){
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
  if(path==='/robots.txt')assert.ok(body.includes('Content-Signal: search=yes, ai-input=yes, ai-train=no'))
  if(path==='/llms.txt'){assert.match(body,/^# /);assert.ok(body.includes(`(${process.env.WORKER_EXPECTED_ORIGIN||'https://kumeelalnahab.com'}/about)`));assert.ok(!body.includes('/admin')&&!body.includes('/member')&&!body.includes('/ideas/certainty'))}
  console.log(`Workers runtime: ${status} ${path}`)
 }
 const origin=process.env.WORKER_EXPECTED_ORIGIN||'https://kumeelalnahab.com'
 for(const [path,status] of [['/en/',200],['/en/writings',200],['/en/about',200],['/en/admin',404],['/en/library',200],['/en/en/about',404],['/en/writings/not-a-translation',404]]){
  const response=await fetch(base+path,{signal:AbortSignal.timeout(20000)})
  const body=await response.text()
  assert.equal(response.status,status,path)
  assert.match(body,/<html[^>]*lang="en"[^>]*dir="ltr"/,path)
  assert.ok(!body.includes('translationDrafts'),path)
  if(status===404)assert.equal(response.headers.get('x-robots-tag'),'noindex, follow',path)
  console.log(`Workers runtime: ${status} ${path}`)
 }
 const arabicHome=await (await fetch(base+'/')).text()
 assert.match(arabicHome,/<html[^>]*lang="ar"[^>]*dir="rtl"/)
 assert.ok(arabicHome.includes(`hreflang="en" href="${origin}/en/"`))
 const sitemap=await (await fetch(base+'/sitemap.xml')).text()
 assert.ok(sitemap.includes(`<loc>${origin}/en/</loc>`)&&sitemap.includes(`<loc>${origin}/en/writings</loc>`))
 assert.ok(!sitemap.includes('/en/admin'))
 const skills=await fetch(base+'/.well-known/agent-skills/index.json')
 assert.equal(skills.status,200)
 const index=await skills.json()
 assert.equal(index.$schema,'https://schemas.agentskills.io/discovery/0.2.0/schema.json')
 for(const skill of index.skills){
  const bytes=new Uint8Array(await (await fetch(base+new URL(skill.url).pathname)).arrayBuffer())
  const hex=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('')
  assert.equal(skill.digest,`sha256:${hex}`,skill.name)
 }
 const markdown=await fetch(base+'/writings',{headers:{Accept:'text/markdown'}})
 assert.equal(markdown.status,200)
 assert.match(markdown.headers.get('content-type'),/^text\/markdown/)
 assert.ok(Number(markdown.headers.get('x-markdown-tokens'))>0)
 const markdownBody=await markdown.text()
 assert.ok(markdownBody.startsWith('---\ntitle: ')&&markdownBody.includes('\n# ')&&!/<[a-z][^>]*>/i.test(markdownBody))
 assert.match((await fetch(base+'/writings')).headers.get('content-type'),/^text\/html/)
 assert.equal((await fetch(base+'/missing-page',{headers:{Accept:'text/markdown'}})).status,404)
 console.log('Workers runtime: Markdown for agents negotiated; HTML stays the default.')
 console.log(`Workers runtime: agent skills index with ${index.skills.length} verified digest(s).`)
 const translate=await fetch(base+'/api/edit-assist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task:'translate',payload:{title:'س',text:'نص',sourceLanguage:'ar',targetLanguage:'en'}})})
 assert.equal(translate.status,401)
 console.log('Workers runtime: English routes, alternates, sitemap and owner-only translation verified.')
 const unauth=await fetch(base+'/api/generate-idea',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})
 assert.equal(unauth.status,401)
 const oversized=await fetch(base+'/api/chat',{method:'POST',body:'x'.repeat(31000)})
 assert.equal(oversized.status,413)
 const head=await fetch(base+'/about',{method:'HEAD'})
 assert.equal(head.status,200)
 assert.equal(await head.text(),'')
 console.log('Workers runtime: unauthorized generation, body limit and HEAD semantics verified.')
}
