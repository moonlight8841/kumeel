import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createServer} from 'vite'
const server=await createServer({server:{middlewareMode:true},appType:'custom'})
try{
 const {resolveLocalePath,localePath,messages}=await server.ssrLoadModule('/src/lib/i18n.ts')
 await test('Locale routing preserves Arabic URLs and rejects unsupported English sections',()=>{
  assert.deepEqual(resolveLocalePath('/en/about'),{locale:'en',path:'/about',supported:true})
  assert.deepEqual(resolveLocalePath('/en/'),{locale:'en',path:'/',supported:true})
  assert.deepEqual(resolveLocalePath('/admin'),{locale:'ar',path:'/admin',supported:true})
  for(const path of ['/en/admin','/en/en/about','/en/writings/a/b'])assert.equal(resolveLocalePath(path).supported,false,path)
  assert.equal(resolveLocalePath('/english').locale,'ar')
  assert.equal(resolveLocalePath('/en/writings/a%20b?x=1').path,'/writings/a%20b')
  assert.equal(localePath('en','/'),'/en/')
  assert.equal(localePath('en','/about'),'/en/about')
  assert.equal(localePath('ar','/writings/a'),'/writings/a')
  assert.equal(localePath('fr','/about'),'/about')
  assert.throws(()=>localePath('en','/admin'))
  assert.throws(()=>localePath('en','//evil.example'))
 })
 await test('Both languages have complete interface messages without external translation',()=>{
  assert.deepEqual(Object.keys(messages.en).sort(),Object.keys(messages.ar).sort())
  for(const locale of ['ar','en'])for(const text of Object.values(messages[locale]))assert.ok(typeof text==='string'&&text.trim())
  assert.equal(messages.en.owner,'Kumeel Al Nahab')
  assert.equal(messages.ar.owner,'كميل ال نهاب')
 })
 const {render}=await server.ssrLoadModule('/src/entry-server.tsx')
 const {initialContent}=await server.ssrLoadModule('/src/content.ts')
 const {sourceDigest}=await server.ssrLoadModule('/src/lib/source-hash.mjs')
 await test('English rendering prefers approved translations and labels original-language content without exposing drafts',async()=>{
  const base={...initialContent,writings:[{id:'a',title:'العنوان الأصلي',text:'النص الأصلي',category:'فلسفة'}]}
  const hash=await sourceDigest(base,'writing:a')
  const published={...base,translations:{'writing:a':{locale:'en',title:'English title',text:'The reviewed text.',sourceHash:hash}}}
  assert.ok(render(base,'/en/').includes('Kumeel Al Nahab'))
  assert.ok(render(base,'/en/writings').includes('href="/en/writings/a"'))
  assert.ok(!render(base,'/en/about').includes('awaiting review'))
  const detail=render(published,'/en/writings/a')
  assert.ok(detail.includes('The reviewed text.'))
  assert.ok(!detail.includes('النص الأصلي'))
  assert.ok(detail.includes('href="/writings/a"'))
  assert.ok(render(base,'/en/writings/a').includes('shown in its original Arabic'))
  assert.ok(render({...published,translationDrafts:{bio:{text:'PRIVATE-SENTINEL'}}},'/en/').includes('English title'))
  assert.ok(!render({...published,translationDrafts:{bio:{text:'PRIVATE-SENTINEL'}}},'/en/').includes('PRIVATE-SENTINEL'))
 })
 const {pageInfo,publicPaths,renderHead,replaceHead}=await server.ssrLoadModule('/src/lib/pages.ts')
 const {resolvePublishedTranslations}=await server.ssrLoadModule('/src/lib/localized-content.ts')
 await test('English SEO pairs translated articles and preserves the Arabic author identity',async()=>{
  const base={...initialContent,writings:[{id:'a',title:'أصل',text:'النص الأصلي',category:'فلسفة'}]}
  const translated={...base,translations:{'writing:a':{locale:'en',title:'English title',text:'Translated text.',sourceHash:await sourceDigest(base,'writing:a')}}}
  const origin='https://kumeelalnahab.com'
  const info=pageInfo(translated,'/en/writings/a')
  assert.equal(info.kind,'writing');assert.equal(info.noindex,false)
  const head=renderHead(translated,info,origin)
  assert.ok(head.includes('hreflang="ar"'))
  assert.ok(head.includes('hreflang="en"'))
  assert.ok(head.includes('hreflang="x-default"'))
  assert.ok(head.includes('rel="canonical" href="https://kumeelalnahab.com/en/writings/a"'))
  const graph=JSON.parse(head.match(/id="kumeel-schema">([\s\S]*?)<\/script>/)[1])['@graph']
  const article=graph.find(n=>n['@type']==='Article')
  assert.equal(article.inLanguage,'en');assert.equal(article.articleBody,'Translated text.')
  assert.equal(article.author['@id'],origin+'/#person')
  assert.equal((replaceHead('<head>'+head+'</head>',head).match(/hreflang="en"/g)||[]).length,1)
  assert.ok(publicPaths(translated).includes('/en/writings/a'))
  assert.ok(publicPaths(base).includes('/en/about'))
  assert.equal(pageInfo(base,'/en/about').noindex,false)
  assert.equal(pageInfo(base,'/en/writings/a').noindex,true)
  assert.equal(pageInfo(base,'/en/admin').kind,'missing')
  const stale=await resolvePublishedTranslations({...translated,writings:[{...base.writings[0],title:'تغيير'}]})
  assert.ok(!publicPaths(stale).includes('/en/writings/a'))
  assert.ok(!renderHead(stale,pageInfo(stale,'/writings/a'),origin).includes('hreflang="en"'))
 })
 await test('Locale metadata links translations to originals without leaking stale or sample pairs',async()=>{
  const base={...initialContent,writings:[{id:'a',title:'أصل',text:'النص الأصلي',category:'فلسفة'}]}
  const translated={...base,translations:{'writing:a':{locale:'en',title:'English title',text:'Translated text.',sourceHash:await sourceDigest(base,'writing:a')}}}
  const origin='https://kumeelalnahab.com'
  const enHead=renderHead(translated,pageInfo(translated,'/en/writings/a'),origin)
  assert.ok(enHead.includes('<meta property="og:locale" content="en_US" />'))
  assert.ok(enHead.includes('<meta property="og:locale:alternate" content="ar_SA" />'))
  assert.ok(enHead.includes('<meta property="og:site_name" content="Kumeel Al Nahab" />'))
  const graph=JSON.parse(enHead.match(/id="kumeel-schema">([\s\S]*?)<\/script>/)[1])['@graph']
  assert.equal(graph.find(n=>n['@type']==='Article').translationOfWork.url,origin+'/writings/a')
  assert.deepEqual(graph.find(n=>n['@type']==='WebSite').inLanguage,['ar','en'])
  const arHead=renderHead(translated,pageInfo(translated,'/writings/a'),origin)
  assert.ok(arHead.includes('<meta property="og:locale" content="ar_SA" />'))
  assert.ok(arHead.includes('<meta property="og:locale:alternate" content="en_US" />'))
  assert.ok(!JSON.parse(arHead.match(/id="kumeel-schema">([\s\S]*?)<\/script>/)[1])['@graph'].find(n=>n['@type']==='Article').translationOfWork)
  const lone=renderHead(base,pageInfo(base,'/writings/a'),origin)
  assert.ok(!lone.includes('og:locale:alternate'))
  assert.equal((replaceHead('<head>'+enHead+'</head>',enHead).match(/og:locale"/g)||[]).length,1)
  // Illustrative starter prose stays unindexed in every language.
  const {legacyContent}=await server.ssrLoadModule('/src/content.ts')
  const sample=legacyContent.writings[0]
  const sampleBase={...initialContent,writings:[sample]}
  const sampleKey=`writing:${sample.id}`
  const sampleTranslated={...sampleBase,translations:{[sampleKey]:{locale:'en',title:'Sample',text:'Sample text.',sourceHash:await sourceDigest(sampleBase,sampleKey)}}}
  assert.equal(pageInfo(sampleTranslated,`/en/writings/${encodeURIComponent(sample.id)}`).noindex,true)
 })
}finally{await server.close()}
