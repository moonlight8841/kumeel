import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { createServer } from 'vite'
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { initialContent, validContent, youtubeEmbed, meetingUrl, httpsUrl } = await server.ssrLoadModule('/src/content.ts')
  const { pageInfo, publicPaths, renderHead, replaceHead, structuredData } = await server.ssrLoadModule('/src/lib/pages.ts')
  const { validNewPassword, safeAuthReturnUrl } = await server.ssrLoadModule('/src/lib/auth-security.ts')
  await test('Authentication rejects weak passwords and untrusted return origins', () => {
    assert.equal(validNewPassword('short'), false)
    assert.equal(validNewPassword('a'.repeat(14)), true)
    assert.equal(validNewPassword('a'.repeat(129)), false)
    assert.equal(safeAuthReturnUrl('https://kumeel-nine.vercel.app'), 'https://kumeel-nine.vercel.app/admin')
    assert.equal(safeAuthReturnUrl('http://127.0.0.1:5173'), 'http://127.0.0.1:5173/admin')
    for (const origin of ['https://evil.example', 'https://kumeel-nine.vercel.app.evil.example', 'http://kumeel-nine.vercel.app']) assert.throws(() => safeAuthReturnUrl(origin))
  })
  const { sessionCalendar } = await server.ssrLoadModule('/src/lib/calendar.ts')
  const { render } = await server.ssrLoadModule('/src/entry-server.tsx')
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
