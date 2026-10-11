import { publicPaths } from '../dist-ssr/entry-server.js'
import { publicContent, siteOrigin } from './public-content.mjs'
const escapeXml = value => value.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char])
export default async function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); return res.status(405).end() }
  const origin = siteOrigin()
  if (!origin) return res.status(503).end()
  const { content, fresh } = await publicContent()
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', fresh ? 'public, s-maxage=300' : 'no-store')
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${publicPaths(content).map(path => `<url><loc>${escapeXml(origin + path)}</loc></url>`).join('')}</urlset>`
  return res.status(200).send(req.method === 'HEAD' ? '' : xml)
}
