import { readFile } from 'node:fs/promises'
import { initialContent, validContent } from '../dist-ssr/entry-server.js'
const config = JSON.parse(await readFile(new URL('../src/supabase-config.json', import.meta.url), 'utf8'))

export function siteOrigin(env = process.env) {
  if (env.SITE_URL) {
    try { const url = new URL(env.SITE_URL); if (url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash) return url.origin } catch { /* Invalid site origins must not enter HTML or sitemaps. */ }
  }
  const host = env.VERCEL_PROJECT_PRODUCTION_URL
  return host && /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(host) ? `https://${host}` : ''
}
export async function publicContent() {
  try {
    const response = await fetch(`${config.url}/rest/v1/kumeel_published?id=eq.main&select=content`, { headers: { apikey: config.publishableKey }, signal: AbortSignal.timeout(5000) })
    if (!response.ok) throw new Error('Public content unavailable')
    const rows = await response.json()
    if (!validContent(rows[0]?.content)) throw new Error('Invalid public content')
    return { content: rows[0].content, fresh: true }
  } catch { console.error('Public content unavailable; serving bundled content'); return { content: initialContent, fresh: false } }
}
