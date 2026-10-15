import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { render, initialContent, readerContent, pageInfo, renderHead, replaceHead,publicPaths,documentLanguage,resolvePublishedTranslations } from '../dist-ssr/entry-server.js'
 const template = await readFile('dist/index.html', 'utf8')
 await writeFile('dist/template.html', template)
 const paths = [...new Set([...publicPaths(await resolvePublishedTranslations(readerContent(initialContent))),'/member','/admin',...(initialContent.ideas??[]).map(i=>`/ideas/${encodeURIComponent(i.id)}`)])]
 for (const path of paths) {
   const content=await resolvePublishedTranslations(path==='/admin'?initialContent:readerContent(initialContent))
   const info = pageInfo(content, path)
   const html = documentLanguage(replaceHead(template, renderHead(content, info)).replace('<div id="root"></div>', () => `<div id="root">${render(content, path)}</div>`),path)
   const dir = path === '/' ? 'dist' : `dist${path}`
   await mkdir(dir, { recursive: true })
   await writeFile(`${dir}/index.html`, html)
 }
 console.log(`Prerendered ${paths.length} pages with page-specific metadata.`)
