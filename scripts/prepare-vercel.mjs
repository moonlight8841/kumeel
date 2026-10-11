import { readdir, unlink } from 'node:fs/promises'
import { resolve, relative, sep } from 'node:path'

// Vercel serves filesystem pages before rewrites. Keep the SSR template and
// assets, but let page requests reach api/page so newly published data is visible.
const output = resolve('dist')
async function removeStaticPages(directory) {
 for (const entry of await readdir(directory, { withFileTypes: true })) {
  const path = resolve(directory, entry.name)
  const within = relative(output, path)
  if (within.startsWith(`..${sep}`) || within === '..') throw new Error('Invalid output path')
  if (entry.isDirectory()) await removeStaticPages(path)
  else if (entry.isFile() && entry.name === 'index.html') await unlink(path)
 }
}
await removeStaticPages(output)
console.log('Prepared Vercel output: page requests use published-content SSR.')
