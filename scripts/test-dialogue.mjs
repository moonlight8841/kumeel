import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createServer} from 'vite'
const server=await createServer({server:{middlewareMode:true},appType:'custom'})
try{
 const {initialContent,validContent}=await server.ssrLoadModule('/src/content.ts')
 const {validExchange}=await server.ssrLoadModule('/src/lib/exchange.ts')
 const {sourceDigest}=await server.ssrLoadModule('/src/lib/source-hash.mjs')
 const {render}=await server.ssrLoadModule('/src/entry-server.tsx')
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
}finally{await server.close()}
