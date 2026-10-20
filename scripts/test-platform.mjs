import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { createServer } from 'vite'
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { legacyContent: initialContent, validContent, youtubeEmbed, meetingUrl, httpsUrl } = await server.ssrLoadModule('/src/content.ts')
  const { pageInfo, publicPaths, renderHead, replaceHead, structuredData } = await server.ssrLoadModule('/src/lib/pages.ts')
  await test('Search identity links the named website, profile and original articles without invented accounts',()=>{
    const origin='https://kumeelalnahab.com'
    const home=pageInfo(initialContent,'/')
    assert.ok(home.title.startsWith('كميل ال نهاب |'))
    const graph=structuredData(initialContent,home,origin)['@graph']
    const person=graph.find(n=>n['@type']==='Person')
    const website=graph.find(n=>n['@type']==='WebSite')
    assert.ok(website)
    assert.equal(website.name,'كميل ال نهاب')
    assert.equal(website.url,origin+'/')
    assert.ok(website.alternateName.includes('Kumeel Al Nahab'))
    assert.equal(website.publisher['@id'],person['@id'])
    assert.equal(person.mainEntityOfPage['@id'],origin+'/about#webpage')
    // Only the owner-confirmed TikTok from site settings; hiding it removes the link.
    assert.deepEqual(person.sameAs,['https://www.tiktok.com/@kumeelalnahab'])
    const hidden={...initialContent,site:{...initialContent.site,showTiktok:false}}
    assert.equal(structuredData(hidden,pageInfo(hidden,'/'),origin)['@graph'].find(n=>n['@type']==='Person').sameAs,undefined)
    const unsafe={...initialContent,site:{...initialContent.site,tiktok:'x"><script>'}}
    assert.equal(structuredData(unsafe,pageInfo(unsafe,'/'),origin)['@graph'].find(n=>n['@type']==='Person').sameAs,undefined)
    const about=structuredData(initialContent,pageInfo(initialContent,'/about'),origin)['@graph'].find(n=>n['@type']==='ProfilePage')
    assert.equal(about['@id'],origin+'/about#webpage')
    assert.equal(about.mainEntity['@id'],person['@id'])
    const writing={id:'original-seo',title:'كتابة أصلية',category:'فلسفة',text:'نص أصلي للنشر'}
    const content={...initialContent,writings:[writing]}
    const article=structuredData(content,pageInfo(content,'/writings/original-seo'),origin)['@graph'].find(n=>n['@type']==='Article')
    assert.equal(article.author['@id'],person['@id'])
    assert.equal(article.author.url,origin+'/about')
    for(const path of ['/','/about','/writings/original-seo']){
      const info=pageInfo(content,path)
      const head=renderHead(content,info,origin)
      assert.ok(head.includes('content="index, follow"'))
      assert.ok(head.includes(`rel="canonical" href="${origin}${path}"`))
      assert.ok(head.includes('property="og:site_name" content="كميل ال نهاب"'))
      const replaced=replaceHead('<head>'+head+'</head>',head)
      assert.equal((replaced.match(/property="og:site_name"/g)||[]).length,1)
    }
    for(const path of ['/admin','/member','/not-found']){
      assert.ok(renderHead(content,pageInfo(content,path),origin).includes('noindex, follow'))
      assert.ok(!publicPaths(content).includes(path))
    }
  })
  const { validNewPassword, safeAuthReturnUrl } = await server.ssrLoadModule('/src/lib/auth-security.ts')
  await test('Authentication rejects weak passwords and untrusted return origins', () => {
    assert.equal(validNewPassword('short'), false)
    assert.equal(validNewPassword('a'.repeat(14)), true)
    assert.equal(validNewPassword('a'.repeat(129)), false)
    assert.equal(safeAuthReturnUrl('https://kumeel-nine.vercel.app'), 'https://kumeel-nine.vercel.app/admin')
    assert.equal(safeAuthReturnUrl('https://kumeelalnahab.com'), 'https://kumeelalnahab.com/admin')
    assert.equal(safeAuthReturnUrl('https://www.kumeelalnahab.com'), 'https://www.kumeelalnahab.com/admin')
    assert.equal(safeAuthReturnUrl('http://127.0.0.1:5173'), 'http://127.0.0.1:5173/admin')
    for (const origin of ['https://evil.example', 'https://kumeel-nine.vercel.app.evil.example', 'http://kumeel-nine.vercel.app']) assert.throws(() => safeAuthReturnUrl(origin))
  })
  const { sessionCalendar } = await server.ssrLoadModule('/src/lib/calendar.ts')
  const {totpQrSource,normalizeTotp}=await server.ssrLoadModule('/src/lib/mfa.ts')
  await test('MFA accepts SDK data URLs without double wrapping and normalizes Arabic codes',()=>{
    const svg='<svg xmlns="http://www.w3.org/2000/svg"><path fill="#000000"/></svg>'
    const expected=`data:image/svg+xml,${encodeURIComponent(svg)}`
    assert.equal(totpQrSource(svg),expected)
    assert.equal(totpQrSource(`data:image/svg+xml;utf-8,${svg}`),expected)
    assert.equal(totpQrSource(expected),expected)
    assert.equal(totpQrSource('https://evil.example/qr'), '')
    assert.equal(normalizeTotp('١٢٣ ٤٥٦'),'123456')
    assert.equal(normalizeTotp('۱۲۳۴۵۶'),'123456')
  })
  const {defaultBooks,validBooks} = await server.ssrLoadModule('/src/books.ts')
  const { render } = await server.ssrLoadModule('/src/entry-server.tsx')
  await test('Community navigation is public, member workspace stays out of search and private payloads',()=>{
    assert.equal(pageInfo(initialContent,'/community').kind,'community')
    assert.equal(pageInfo(initialContent,'/member').noindex,true)
    assert.ok(publicPaths(initialContent).includes('/community'))
    assert.ok(!publicPaths(initialContent).includes('/member'))
    const publicHtml=render(initialContent,'/community')
    assert.ok(publicHtml.includes('مجتمع كميل'))
    assert.ok(publicHtml.includes('href="/member"'))
    assert.ok(!publicHtml.includes('review_note'))
  })
  await test('Notebook formatting remains escaped text and public pages expose a login entry and mind exercises',()=>{
    const writing={id:'safe-notebook',title:'Notebook',category:'فلسفة',format:'markdown',text:'## Heading\n\n**Evidence**\n\n- First\n- Second\n\n> Reflection\n\n<script>alert(1)</script>'}
    const content={...initialContent,writings:[writing]}
    assert.equal(validContent(content),true)
    assert.equal(validContent({...content,writings:[{...writing,format:'html'}]}),false)
    const markup=render(content,'/writings/safe-notebook')
    assert.ok(markup.includes('<h2>Heading</h2>'))
    assert.ok(markup.includes('<strong>Evidence</strong>'))
    assert.ok(markup.includes('<li>First</li>'))
    assert.ok(markup.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
    assert.ok(!markup.includes('<script>alert(1)</script>'))
    assert.ok(render(content,'/').includes('تسجيل الدخول إلى حسابك'))
    assert.ok(render({...content,ideas:content.ideas.map(i=>({...i,sample:false}))},'/observatory').includes('اكشف زاوية أخرى'))
    assert.ok(render({...content,ideas:content.ideas.map(i=>({...i,sample:false}))},'/observatory').includes('السؤال التالي'))
  })
  await test('Library validates PDF links, preserves legacy content, and exposes author-attributed book pages',()=>{
    assert.equal(defaultBooks.length,30)
    assert.equal(validBooks(defaultBooks),true)
    assert.equal(validContent({...initialContent,books:undefined}),true)
    assert.equal(validContent({...initialContent,site:{...initialContent.site,sections:initialContent.site.sections.filter(s=>s.key!=='library')}}),true)
    for(const books of [[null],[defaultBooks[0],defaultBooks[0]],[{...defaultBooks[0],fileUrl:'javascript:alert(1)'}],[{...defaultBooks[0],fileUrl:'https://evil.example/payload.html'}],[{...defaultBooks[0],pages:-1}]])assert.equal(validBooks(books),false)
    assert.equal(pageInfo(initialContent,'/library').kind,'library')
    assert.equal(pageInfo(initialContent,'/library/not-a-book').kind,'missing')
    const book=defaultBooks.find(b=>b.id==='meditations')
    const info=pageInfo(initialContent,`/library/${book.id}`)
    assert.equal(info.book.author,'Marcus Aurelius')
    const schema=structuredData(initialContent,info,'https://kumeel-nine.vercel.app')['@graph'][1]
    assert.equal(schema['@type'],'Book')
    assert.equal(schema.author.name,'Marcus Aurelius')
    assert.ok(render(initialContent,`/library/${book.id}`).includes(book.fileUrl))
    assert.ok(publicPaths(initialContent).includes(`/library/${book.id}`))
    assert.ok(!publicPaths({...initialContent,books:[]}).includes(`/library/${book.id}`))
  })
  await test('Editorial notes and session archive fields validate safely without breaking old content',()=>{
    const book={...defaultBooks[0],review:'My reading',quote:'<script>unsafe</script>',quoteSource:'Page 10'}
    assert.equal(validBooks([book]),true)
    assert.equal(validBooks([{...book,review:123}]),false)
    const html=render({...initialContent,books:[book]},`/library/${book.id}`)
    assert.ok(html.includes('My reading'))
    assert.ok(html.includes('&lt;script&gt;unsafe&lt;/script&gt;'))
    const session={id:'test-session',title:'Dialogue',question:'Why?',startsAt:'2026-01-01T12:00:00+03:00',durationMinutes:40,joinUrl:'https://meet.google.com/abc-defg-hij',registrationUrl:'https://forms.example/register',summary:'Summary',summaryPdfUrl:'https://example.com/summary.pdf',recordingUrl:'https://youtu.be/abcdefghijk'}
    assert.equal(validContent({...initialContent,sessions:[session]}),true)
    for(const field of ['registrationUrl','summaryPdfUrl','recordingUrl'])assert.equal(validContent({...initialContent,sessions:[{...session,[field]:'javascript:alert(1)'}]}),false)
    assert.equal(validContent({...initialContent,sessions:[{...session,summaryPdfUrl:'https://example.com/page.html'}]}),false)
  })
  await test('Newsletter preserves legacy sites and accepts only public HTTPS forms',()=>{
    assert.equal(validContent(initialContent),true)
    const content={...initialContent,site:{...initialContent.site,newsletterUrl:'https://example.com/signup'}}
    assert.equal(validContent(content),true)
    assert.ok(render(content,'/').includes('https://example.com/signup'))
    assert.ok(render(content,'/salon').includes('https://example.com/signup'))
    for(const url of ['javascript:alert(1)','http://example.com','https://user:password@example.com','/images/local.png'])assert.equal(validContent({...content,site:{...content.site,newsletterUrl:url}}),false)
    assert.ok(!render(initialContent,'/').includes('href="undefined"'))
  })
  const {contentForPage}=await server.ssrLoadModule('/src/lib/content-scope.ts')
  const {sortedWritings}=await server.ssrLoadModule('/src/lib/writings.ts')
  await test('Tree navigation scopes public payloads and orders dated writings without inventing dates',()=>{
    const dated=[{...initialContent.writings[0],id:'older',publishedAt:'2026-01-01'},{...initialContent.writings[0],id:'newer',publishedAt:'2026-02-01'},initialContent.writings[1]]
    assert.deepEqual(sortedWritings(dated).map(w=>w.id),['newer','older','light'])
    assert.equal(validContent({...initialContent,writings:[{...dated[0],publishedAt:'2026-02-30'}]}),false)
    assert.equal(pageInfo(initialContent,'/writings').kind,'writings')
    assert.ok(publicPaths(initialContent).includes('/writings'))
    const home=contentForPage({...initialContent,writings:dated},'/')
    assert.equal(home.writings.length,2)
    assert.equal(home.books.length,0)
    assert.ok(validContent(home))
    const single=contentForPage(initialContent,'/writings/meaning')
    assert.equal(single.writings.length,0)
    assert.equal(single.ideas.length,0)
    assert.ok(!render(single,'/writings/meaning').includes(initialContent.writings[0].text))
    const markup=render(initialContent,'/')
    assert.ok(!markup.includes('id="assumption-lab"'))
    assert.ok(!markup.includes('reasoning-game'))
  })
  await test('Production prerender uses the production renderer and excludes development controls', async () => {
    const production = await import('../dist-ssr/entry-server.js')
    const markup = production.render(production.initialContent, '/admin')
    const html = await readFile('dist/admin/index.html', 'utf8')
    assert.ok(html.includes(`<div id="root">${markup}</div>`))
    assert.ok(!html.includes('فتح تجربة الإدارة المحلية'))
    assert.ok(html.includes('id="login-email"'))
  })
  const approved = { id: 'approved', title: 'فكرة معتمدة', kind: 'حكمة', text: 'نص مستقل للفكرة.', question: 'كيف نختبرها؟', sample: false }
  const video = { id: 'lesson', type: 'فيديو', title: 'درس مرئي', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', purpose: 'درس مرئي', description: 'ملخص الدرس.', thumbnail: 'https://example.com/poster.jpg', uploadedAt: '2026-10-11T12:00:00+03:00' }
  const session = { id: 'discussion', title: 'حوار, وفكرة', question: 'سؤال\nBEGIN:VEVENT', startsAt: '2026-10-12T17:00:00+03:00', durationMinutes: 40, joinUrl: 'https://meet.google.com/abc-defg-hij' }
  const content = { ...initialContent, ideas: [...initialContent.ideas, approved], media: [video], sessions: [session] }
  await test('Legacy content remains valid; new content validates and malformed arrays never throw', () => {
    assert.equal(validContent({ bio: 'نبذة قديمة', writings: [], media: [] }), true)
    assert.equal(validContent(content), true)
    for (const patch of [{ ideas: [null] }, { sessions: [null] }, { media: [null] }, { writings: [null] }, { ideas: [approved, approved] }, { sessions: [{ ...session, startsAt: '2026-10-12T17:00' }] }, { sessions: [{ ...session, durationMinutes: -1 }] }, { media: [{ ...video, purpose: 'حكمة بصرية' }] }, { ideas: [{ ...approved, sourceUrl: 'javascript:alert(1)' }] }]) assert.equal(validContent({ ...content, ...patch }), false)
  })
  await test('Admin starts locked, stays out of search, and site settings validate safely', () => {
    assert.equal(pageInfo(content, '/admin').kind, 'admin')
    assert.equal(pageInfo(content, '/admin').noindex, true)
    assert.ok(!publicPaths(content).includes('/admin'))
    const admin = render(content, '/admin')
    assert.ok(admin.includes('تسجيل الحساب وحده لا يمنح صلاحيات'))
    assert.ok(!admin.includes('حفظ الهوية والتصميم'))
    assert.ok(!admin.includes('تأكيد النشر العام'))
    for (const patch of [{site:null}, {site:{...content.site,whatsapp:'javascript:alert(1)'}}, {site:{...content.site,heroImage:'javascript:alert(1)'}}, {site:{...content.site,sections:content.site.sections.map(s=>({...s,visible:false}))}}, {discoveries:[null]}, {quiz:[null]}, {quiz:[{title:'سؤال',options:['أ','ب'],answer:2,why:'تفسير'}]}]) assert.equal(validContent({...content,...patch}),false)
    const home=render({...content,site:{...content.site,heroTitle:'عنوان معدّل',showWhatsapp:false}}, '/')
    assert.ok(home.includes('عنوان معدّل'))
    assert.ok(!home.includes('https://wa.me/'))
    assert.ok(render(content,'/about').includes('https://wa.me/966558232644'))
  })
  await test('Provider URLs cannot introduce arbitrary frames, credentials, or calendar line injection', () => {
    assert.equal(youtubeEmbed('https://youtu.be/dQw4w9WgXcQ'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    assert.equal(youtubeEmbed('https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ'), null)
    assert.equal(youtubeEmbed('https://youtube.com/watch?v=too-short'), null)
    assert.equal(meetingUrl('https://meet.google.com.evil.example/abc-defg-hij'), false)
    assert.equal(meetingUrl('https://meet.google.com:9000/abc-defg-hij'), false)
    assert.equal(httpsUrl('https://example.com/\nBEGIN:VEVENT'), false)
    assert.equal(httpsUrl('https://user:password@example.com'), false)
  })
  await test('Every published material has distinct metadata, sample pages are excluded from the sitemap', () => {
    const paths = publicPaths(content)
    assert.ok(paths.includes('/about'))
    assert.ok(paths.includes('/ideas/approved'))
    assert.ok(paths.includes('/media/lesson'))
    assert.ok(!paths.includes('/ideas/certainty'))
    assert.ok(!paths.includes('/writings/meaning'))
    assert.equal(pageInfo(content, '/ideas/certainty').noindex, true)
    assert.equal(pageInfo(content, '/ideas/approved').noindex, false)
    assert.equal(pageInfo(content, '/ideas/unknown').kind, 'missing')
    assert.equal(pageInfo(content, '/ideas/%zz').kind, 'missing')
    const approvedHead = renderHead(content, pageInfo(content, '/ideas/approved'), 'https://kumeel.example')
    assert.match(approvedHead, /فكرة معتمدة \| كميل ال نهاب/)
    assert.match(approvedHead, /href="https:\/\/kumeel.example\/ideas\/approved"/)
    const data = structuredData(content, pageInfo(content, '/media/lesson'), 'https://kumeel.example')
    assert.equal(data['@graph'][1]['@type'], 'VideoObject')
    assert.equal(data['@graph'][1].uploadDate, video.uploadedAt)
    const incomplete = { ...content, media: [{ ...video, uploadedAt: undefined }] }
    assert.equal(structuredData(incomplete, pageInfo(incomplete, '/media/lesson'))['@graph'][1]['@type'], 'CreativeWork')
  })
  await test('Untrusted content remains text in HTML and JSON-LD; replacement does not add duplicate metadata', () => {
    const hostile = { ...content, ideas: [{ ...approved, title: '"><script>alert(1)</script>', text: '</script><script>alert(1)</script>' }] }
    const head = renderHead(hostile, pageInfo(hostile, '/ideas/approved'), 'https://kumeel.example')
    assert.ok(!head.includes('<script>alert(1)</script>'))
    const html = replaceHead('<head><title>old</title><meta name="description" content="old"><script type="application/ld+json">{}</script></head>', head)
    assert.equal((html.match(/<title>/g) || []).length, 1)
    assert.equal((html.match(/name="description"/g) || []).length, 1)
    assert.equal((html.match(/application\/ld\+json/g) || []).length, 1)
  })
  await test('Calendar preserves Riyadh time and escapes injected lines with valid UTF-8 folding', () => {
    const ics = sessionCalendar(session, new Date('2026-10-11T00:00:00Z'))
    assert.match(ics, /DTSTART:20261012T140000Z/)
    assert.match(ics, /DTEND:20261012T144000Z/)
    assert.equal((ics.match(/\r\nBEGIN:VEVENT\r\n/g) || []).length, 1)
    assert.match(ics, /SUMMARY:حوار\\, وفكرة/)
    for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75)
  })
  await test('SSR renders the complete idea, source context, video player, and owner without JavaScript', () => {
    const html = render(content, '/ideas/approved')
    assert.match(html, /نص مستقل للفكرة/)
    assert.match(html, /كميل ال نهاب/)
    assert.ok(!html.includes('عدستي'))
    assert.match(render(content, '/media/lesson'), /iframe[^>]*src="https:\/\/www.youtube-nocookie.com\/embed\/dQw4w9WgXcQ"/)
    assert.match(render(content, '/about'), /من هو كميل ال نهاب؟/)
  })
  await test('Page and sitemap handlers serve published data, 404/HEAD/405 semantics, and correct canonical URLs', async () => {
    const { default: handler } = await import('../api/page.mjs')
    const { default: sitemap } = await import('../api/sitemap.mjs')
    const { default: robots } = await import('../api/robots.mjs')
    const { siteOrigin } = await import('../api/public-content.mjs')
    assert.equal(siteOrigin({ SITE_URL: 'https://kumeel.example/' }), 'https://kumeel.example')
    assert.equal(siteOrigin({ SITE_URL: 'https://evil.example/<script>' }), '')
    const originalFetch = globalThis.fetch
    const originalOrigin = process.env.SITE_URL
    process.env.SITE_URL = 'https://kumeel.example'
    globalThis.fetch = async () => new Response(JSON.stringify([{ content }]), { headers: { 'Content-Type': 'application/json' } })
    const response = () => ({ code: 200, headers: {}, body: '', setHeader(key, value) { this.headers[key] = value }, status(code) { this.code = code; return this }, send(body) { this.body = body; return this }, end() { return this } })
    try {
      let res = response(); await handler({ method: 'GET', query: { path: '/ideas/approved' } }, res)
      assert.equal(res.code, 200); assert.match(res.body, /نص مستقل للفكرة/); assert.match(res.body, /https:\/\/kumeel.example\/ideas\/approved/)
      res = response(); await handler({ method: 'GET', query: { path: '/ideas/absent' } }, res)
      assert.equal(res.code, 404); assert.equal(res.headers['X-Robots-Tag'], 'noindex, follow')
      res = response(); await handler({ method: 'HEAD', query: { path: '/about' } }, res); assert.equal(res.body, '')
      res = response(); await handler({ method: 'POST' }, res); assert.equal(res.code, 405)
      res = response(); await sitemap({ method: 'GET' }, res); assert.match(res.body, /\/ideas\/approved/); assert.ok(!res.body.includes('/ideas/certainty'))
      res = response(); await robots({ method: 'GET' }, res); assert.match(res.body, /Sitemap: https:\/\/kumeel.example\/sitemap.xml/)
    } finally { globalThis.fetch = originalFetch; if (originalOrigin === undefined) delete process.env.SITE_URL; else process.env.SITE_URL = originalOrigin }
  })
} finally { await server.close() }
