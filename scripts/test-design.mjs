import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { initialContent, validContent } = await server.ssrLoadModule('/src/content.ts')
  const { render } = await server.ssrLoadModule('/src/entry-server.tsx')
  const { parseAdminTab, contentHealth, contentStats, adminTabs } = await server.ssrLoadModule('/src/lib/admin.ts')
  const { isCurrentPath } = await server.ssrLoadModule('/src/lib/navigation.ts')

  await test('Site themes: every declared theme validates, unknown themes are rejected', () => {
    for (const theme of ['olive', 'ink', 'sage']) assert.equal(validContent({ ...initialContent, site: { ...initialContent.site, theme } }), true)
    assert.equal(validContent({ ...initialContent, site: { ...initialContent.site, theme: 'neon' } }), false)
    assert.ok(render({ ...initialContent, site: { ...initialContent.site, theme: 'sage' } }, '/').includes('theme-sage'))
  })

  await test('Home renders sections in the owner\'s order and honours visibility', () => {
    const sections = initialContent.site.sections
    const reordered = [sections.find(s => s.key === 'quote'), ...sections.filter(s => s.key !== 'quote')]
    const html = render({ ...initialContent, site: { ...initialContent.site, sections: reordered } }, '/')
    assert.ok(html.indexOf('home-quote') > -1 && html.indexOf('home-quote') < html.indexOf('hero-name'), 'quote should precede hero')
    const hidden = sections.map(s => (s.key === 'writings' ? { ...s, visible: false } : s))
    assert.ok(!render({ ...initialContent, site: { ...initialContent.site, sections: hidden } }, '/').includes('أحدث ما كُتب'))
    assert.ok(render(initialContent, '/').includes('أحدث ما كُتب'))
  })

  await test('Navigation marks the current page for assistive technology', () => {
    assert.equal(isCurrentPath('/', '/'), true)
    assert.equal(isCurrentPath('/', '/writings'), false)
    assert.equal(isCurrentPath('/observatory', '/ideas/x'), true)
    assert.equal(isCurrentPath('/library', '/library/meditations'), true)
    assert.match(render(initialContent, '/writings'), /href="\/writings" aria-current="page"/)
  })

  await test('Admin: tab hashes resolve, legacy aliases map, unknown hashes are ignored', () => {
    assert.equal(parseAdminTab('#settings'), 'settings')
    assert.equal(parseAdminTab('#library'), 'arrange')
    assert.equal(parseAdminTab('#nope'), null)
    assert.equal(new Set(adminTabs.map(t => t.key)).size, adminTabs.length)
  })

  await test('Admin: content health flags reader-facing problems, warnings first', () => {
    const site = { ...initialContent.site, heroImageAlt: '', showEmail: false, showTiktok: false, showWhatsapp: false }
    const issues = contentHealth({ ...initialContent, site }, Date.now())
    const ids = issues.map(i => i.id)
    assert.ok(ids.includes('hero-alt') && ids.includes('contact'))
    const firstInfo = issues.findIndex(i => i.level === 'info')
    assert.ok(firstInfo === -1 || issues.slice(firstInfo).every(i => i.level === 'info'))
    const stats = contentStats(initialContent, Date.now())
    assert.equal(stats.find(s => s.label === 'كتابات').value, initialContent.writings.length)
  })

  await test('Admin SSR keeps the authorization gate and no editing tools', () => {
    const html = render(initialContent, '/admin')
    assert.ok(html.includes('تسجيل الحساب وحده لا يمنح صلاحيات'))
    assert.ok(!html.includes('حفظ الهوية والتصميم'))
    assert.ok(!html.includes('admin-nav-item'))
  })
} finally {
  await server.close()
}
