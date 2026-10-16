import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createServer} from 'vite'
const server=await createServer({server:{middlewareMode:true},appType:'custom'})
try{
 const {initialContent,validContent}=await server.ssrLoadModule('/src/content.ts')
 const {validExchange}=await server.ssrLoadModule('/src/lib/exchange.ts')
 const {sourceDigest}=await server.ssrLoadModule('/src/lib/source-hash.mjs')
 const {render}=await server.ssrLoadModule('/src/entry-server.tsx')
 const {safeNext}=await server.ssrLoadModule('/src/lib/navigation.ts')
 const round={style:'logic',objection:'تفترض المقدمة الأولى دون أن تبيّن سببها.',reply:'لأن الثانية تلزم عنها.',publishedAt:'2026-10-17T10:00:00.000Z'}
 const writing={id:'dialogue',title:'الحرية',category:'فلسفة',text:'الحرية أن تختار ما تريد. ومن لا يختار لا يعيش حقًا.'}
 const withRounds=rounds=>({...initialContent,writings:[{...writing,exchange:rounds}]})

 await test('Exchange rounds are optional, bounded and strictly shaped',()=>{
  assert.equal(validContent({...initialContent,writings:[writing]}),true)
  assert.equal(validContent(withRounds([round])),true)
  assert.equal(validContent(withRounds(Array(5).fill(round))),true)
  for(const bad of [[],Array(6).fill(round),[{...round,style:'oracle'}],[{...round,objection:'قصير'}],[{...round,objection:'ا'.repeat(2001)}],[{...round,reply:'  '}],[{...round,reply:'ا'.repeat(4001)}],[{...round,publishedAt:'yesterday'}],[{...round,extra:true}],'not-array'])
   assert.equal(validContent(withRounds(bad)),false,JSON.stringify(bad).slice(0,60))
  assert.equal(validExchange([round]),true)
 })

 await test('Publishing a round never stales the English translation',async()=>{
  const plain={...initialContent,writings:[writing]}
  assert.equal(await sourceDigest(withRounds([round]),'writing:dialogue'),await sourceDigest(plain,'writing:dialogue'))
 })
 await test('Writing pages render published rounds as escaped, labelled text and keep readers on the page',()=>{
  const markup=render(withRounds([{...round,reply:'<script>alert(1)</script>'}]),'/writings/dialogue')
  assert.ok(markup.includes('اعتراض وجواب'))
  assert.ok(markup.includes('اعتراض صاغه محاور آلي ونشره الكاتب'))
  assert.ok(markup.includes('المنطقي'))
  assert.ok(markup.includes(round.objection))
  assert.ok(markup.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
  assert.ok(!markup.includes('<script>alert(1)</script>'))
  assert.ok(markup.includes('href="#responses"'))
  assert.ok(!markup.includes('أكمل السؤال في مجلس الحوار'))
  assert.ok(!render({...initialContent,writings:[writing]},'/writings/dialogue').includes('اعتراض وجواب'))
 })
 await test('Sign-in returns only to same-site paths',()=>{
  const origin='https://kumeelalnahab.com'
  assert.equal(safeNext('/writings/x#responses',origin),'/writings/x#responses')
  assert.equal(safeNext('/writings/%D8%A7',origin),'/writings/%D8%A7')
  for(const bad of [null,'','writings/x','//evil.com','/\\evil.com','https://evil.com','/x\nSet-Cookie','/'+'a'.repeat(400)])assert.equal(safeNext(bad,origin),null,String(bad))
 })

 await test('Writing pages carry the opinions section shell during SSR',()=>{
  const markup=render({...initialContent,writings:[writing]},'/writings/dialogue')
  assert.ok(markup.includes('id="responses"'))
  assert.ok(markup.includes('آراء القراء'))
  assert.ok(!render({...initialContent,ideas:initialContent.ideas.map(i=>({...i,sample:false}))},'/ideas/certainty').includes('id="responses"'))
 })
}finally{await server.close()}
