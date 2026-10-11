import { readFile } from 'node:fs/promises'
import { render, contentForPage, pageInfo, renderHead, replaceHead } from '../dist-ssr/entry-server.js'
import { publicContent, siteOrigin } from './public-content.mjs'
const template = await readFile(new URL('../dist/template.html', import.meta.url), 'utf8')
const safeJson = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
export default async function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); return res.status(405).end() }
  const { content, fresh } = await publicContent()
  const requested = req.query?.path
  const pathname = typeof requested === 'string' && requested.startsWith('/') && requested.length <= 2000 ? requested : '/'
  const info = pageInfo(content, pathname)
  const scoped = contentForPage(content, pathname)
  const markup = `<div id="root">${render(scoped, pathname)}</div><script type="application/json" id="kumeel-content">${safeJson(scoped)}</script>`
  const html = replaceHead(template, renderHead(content, info, siteOrigin())).replace('<div id="root"></div>', () => markup)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', ['admin','member'].includes(info.kind) ? 'no-store' : fresh ? 'public, s-maxage=60, stale-while-revalidate=300' : 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (info.noindex) res.setHeader('X-Robots-Tag', 'noindex, follow')
  return res.status(info.kind === 'missing' ? 404 : 200).send(req.method === 'HEAD' ? '' : html)
}
