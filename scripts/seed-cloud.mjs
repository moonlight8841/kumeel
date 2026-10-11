import { readFile } from 'node:fs/promises'
import { createServer } from 'vite'
const values = Object.fromEntries((await readFile('.env', 'utf8')).split('\n').filter(line => line.includes('=')).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }))
const base = 'https://api.supabase.com/v1/projects/ktwugokiznarbnsvohzq'
const headers = { Authorization: `Bearer ${values.supabase}`, 'User-Agent': 'kumeel-deployment', 'Content-Type': 'application/json' }
async function api(path, data) {
  const response = await fetch(base + path, { headers, ...(data ? { method: 'POST', body: JSON.stringify(data) } : {}), signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`Supabase management failed (${response.status})`)
  return response.json()
}
const keys = await api('/api-keys')
const key = keys.find(key => key.name === 'service_role')?.api_key
if (!key) throw new Error('Server key unavailable')
const upload = await fetch('https://ktwugokiznarbnsvohzq.supabase.co/storage/v1/object/kumeel-media/site/desert.png', { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'image/png', 'x-upsert': 'false' }, body: await readFile('public/images/desert.png'), signal: AbortSignal.timeout(30000) })
if (!upload.ok && upload.status !== 400 && upload.status !== 409) throw new Error(`Asset upload failed (${upload.status})`)
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { initialContent } = await server.ssrLoadModule('/src/content.ts')
  const payload = JSON.stringify(initialContent).replaceAll("'", "''")
  await api('/database/query', { query: `insert into public.kumeel_published(id,content) values ('main','${payload}'::jsonb) on conflict (id) do nothing` })
  console.log('Initial public content seeded; existing publication preserved.')
} finally { await server.close() }
