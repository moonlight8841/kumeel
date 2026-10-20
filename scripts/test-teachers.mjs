import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {test} from 'node:test'
import {createServer} from 'vite'

const server=await createServer({server:{middlewareMode:true},appType:'custom'})
try{
 const t=await server.ssrLoadModule('/src/lib/teachers.ts')
 const {defaultSite,withLibrary,validSite}=await server.ssrLoadModule('/src/site.ts')
 const {siteNav,fullSiteNav}=await server.ssrLoadModule('/src/lib/navigation.ts')
 const {publicPaths}=await server.ssrLoadModule('/src/lib/pages.ts')
 const {initialContent}=await server.ssrLoadModule('/src/content.ts')
 const {render}=await server.ssrLoadModule('/src/entry-server.tsx')
 const sql=await readFile(new URL('../supabase/teachers.sql',import.meta.url),'utf8')

 await test('Teachers: field limits in code match the database checks',()=>{
  for(const f of t.teacherFields){
   if(f.key==='qualifications'){assert.match(sql,new RegExp(`qualifications text not null default '' check\\(char_length\\(qualifications\\)<=${f.max}\\)`));continue}
   const m=sql.match(new RegExp(`${f.key} text not null check\\(char_length\\(btrim\\(${f.key}\\)\\) between (\\d+) and (\\d+)\\)`))
   assert.ok(m,`no SQL check for ${f.key}`)
   assert.deepEqual([f.min,f.max],[Number(m[1]),Number(m[2])],f.key)
  }
 })

 await test('Teachers: who may edit matches kumeel_apply_teacher',()=>{
  const m=sql.match(/old\.status not in \(([^)]*)\)/)
  const editable=m[1].split(',').map(s=>s.trim().replace(/'/g,''))
  for(const s of ['pending','published','changes_requested','rejected'])assert.equal(t.statusInfo[s].canEdit,editable.includes(s),s)
  assert.equal(t.statusInfo.new.canEdit,true)
 })

 await test('Teachers: validation counts trimmed text and treats qualifications as optional',()=>{
  const blank=t.fieldErrors(t.blankApplication())
  assert.deepEqual(Object.keys(blank).sort(),['approach','audience','bio','name','specialty'])
  const good={...t.blankApplication(),name:'سارة',specialty:'الفلسفة',bio:'ب'.repeat(80),approach:'ح'.repeat(30),audience:'المرحلة الثانوية',languages:'العربية'}
  assert.equal(t.applicationReady(good),true)
  assert.equal(t.applicationReady({...good,bio:`  ${'ب'.repeat(79)}   `}),false,'whitespace does not count')
  assert.equal(t.applicationReady({...good,qualifications:'q'.repeat(2001)}),false)
 })

 await test('Teachers: presentation helpers',()=>{
  assert.equal(t.excerpt('نص قصير'),'نص قصير')
  const long=t.excerpt('كلمة '.repeat(60),50);assert.ok(long.endsWith('…')&&long.length<=51&&!long.includes('  '))
  assert.deepEqual(t.languageList('العربية، الإنجليزية, الفرنسية والألمانية'),['العربية','الإنجليزية','الفرنسية','الألمانية'])
  assert.equal(t.initials('سارة أحمد'),'سأ')
  assert.equal(t.validTeacherId('8f14e45f-ceea-467a-9575-6f0b1a5c2d11'),true)
  for(const bad of [null,'1 or 1=1','../x'])assert.equal(t.validTeacherId(bad),false)
 })

 await test('Teachers: search input cannot alter the PostgREST filter',()=>{
  assert.equal(t.searchTerm('فلسفة,name.eq.x)(%*'),'فلسفة name eq x')
  assert.equal(t.searchFilter('  '),'')
  const f=t.searchFilter('الفيزياء');assert.equal(f.split(',').length,4);assert.ok(f.includes('specialty.ilike.*الفيزياء*'))
 })

 await test('Teachers: placement in navigation, home sections and stored settings',()=>{
  const nav=fullSiteNav.map(([href])=>href);assert.equal(nav.indexOf('/teachers'),nav.indexOf('/salon')+1)
  assert.ok(!siteNav.some(([href])=>href==='/teachers'),'Hidden until the council is ready')
  const keys=defaultSite.sections.map(s=>s.key);assert.equal(keys.indexOf('teachers'),keys.indexOf('salon')+1)
  const legacy={...defaultSite,sections:defaultSite.sections.filter(s=>s.key!=='teachers'&&s.key!=='library')}
  assert.equal(validSite(legacy),true,'settings saved before the feature stay valid')
  const restored=withLibrary(legacy).sections.map(s=>s.key)
  assert.deepEqual(restored,keys,'missing sections return at their default position')
  assert.equal(validSite({...defaultSite,sections:[...defaultSite.sections,{key:'ads',label:'x',visible:true}]}),false)
  // The council is hidden from every public surface while TEACHERS_PUBLIC is false.
  assert.ok(!render(initialContent,'/').includes('href="/teachers"'))
  assert.ok(!render(initialContent,'/').includes('معلمون يساعدونك على الفهم'))
  assert.ok(!render(initialContent,'/teachers').includes('اكتشف من يساعدك على الفهم'))
  assert.ok(!publicPaths(initialContent).some(p=>p.endsWith('/teachers')),'Not listed in the sitemap')
 })
}finally{await server.close()}
