import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { render, initialContent, pageInfo, renderHead, replaceHead } from '../dist-ssr/entry-server.js'
 const template = await readFile('dist/index.html', 'utf8')
 await writeFile('dist/template.html', template)
 const paths = ['/', '/admin', '/about', '/observatory', '/salon', ...(initialContent.ideas ?? []).map(i => `/ideas/${encodeURIComponent(i.id)}`), ...initialContent.writings.map(w => `/writings/${encodeURIComponent(w.id)}`)]
 for (const path of paths) {
   const info = pageInfo(initialContent, path)
   const html = replaceHead(template, renderHead(initialContent, info)).replace('<div id="root"></div>', () => `<div id="root">${render(initialContent, path)}</div>`)
   const dir = path === '/' ? 'dist' : `dist${path}`
   await mkdir(dir, { recursive: true })
   await writeFile(`${dir}/index.html`, html)
 }
 console.log(`Prerendered ${paths.length} Arabic pages with page-specific metadata.`)
