// Builds the Agent Skills discovery index (RFC v0.2.0) from the exact SKILL.md bytes shipped in dist.
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const origin = 'https://kumeelalnahab.com'
const root = 'dist/.well-known/agent-skills'
const skills = []
for (const entry of (await readdir(root, { withFileTypes: true })).filter(e => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
  const bytes = await readFile(`${root}/${entry.name}/SKILL.md`)
  const front = bytes.toString('utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? ''
  const field = key => front.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1].trim()
  if (field('name') !== entry.name || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(entry.name) || !field('description')) throw new Error(`Invalid skill: ${entry.name}`)
  skills.push({ name: entry.name, type: 'skill-md', description: field('description'), url: `${origin}/.well-known/agent-skills/${entry.name}/SKILL.md`, digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}` })
}
await writeFile(`${root}/index.json`, JSON.stringify({ $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json', skills }, null, 2) + '\n')
console.log(`Agent skills index: ${skills.length} skill(s).`)
