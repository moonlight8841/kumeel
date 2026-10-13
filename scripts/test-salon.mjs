import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createServer} from 'vite'

const server=await createServer({server:{middlewareMode:true},appType:'custom'})
try{
 const salon=await server.ssrLoadModule('/src/lib/salon.ts')
 const {initialContent,validContent}=await server.ssrLoadModule('/src/content.ts')
 const {render}=await server.ssrLoadModule('/src/entry-server.tsx')
 const {publicPaths}=await server.ssrLoadModule('/src/lib/pages.ts')
 const base={joinUrl:'https://meet.google.com/abc-defg-hij',question:'ما العدل؟',durationMinutes:60}
 const at=(id,iso,extra={})=>({id,title:`لقاء ${id}`,startsAt:iso,...base,...extra})
 const T=Date.parse('2026-10-20T18:00:00+03:00')

 await test('Salon: states switch exactly at start and end',()=>{
  const s=at('a','2026-10-20T18:00:00+03:00')
  assert.equal(salon.sessionState(s,T-1),'upcoming')
  assert.equal(salon.sessionState(s,T),'live')
  assert.equal(salon.sessionState(s,T+60*60000-1),'live')
  assert.equal(salon.sessionState(s,T+60*60000),'ended')
  assert.equal(salon.sessionState({...s,cancelled:true},T),'cancelled')
 })

 await test('Salon: schedule puts live first, then next, later, future cancellations and a newest-first archive',()=>{
  const list=[at('later','2026-11-01T18:00:00+03:00'),at('past1','2026-09-01T18:00:00+03:00'),at('next','2026-10-25T18:00:00+03:00'),at('past2','2026-10-01T18:00:00+03:00'),at('gone','2026-10-30T18:00:00+03:00',{cancelled:true}),at('oldCancel','2026-08-01T18:00:00+03:00',{cancelled:true})]
  const before=salon.salonSchedule(list,T)
  assert.equal(before.live,undefined);assert.equal(before.next.id,'next')
  assert.deepEqual(before.later.map(s=>s.id),['later'])
  assert.deepEqual(before.cancelled.map(s=>s.id),['gone'])
  assert.deepEqual(before.archive.map(s=>s.id),['past2','past1'])
  const during=salon.salonSchedule([...list,at('now','2026-10-20T17:30:00+03:00')],T)
  assert.equal(during.live.id,'now');assert.equal(during.next,undefined);assert.deepEqual(during.later.map(s=>s.id),['next','later'])
 })

 await test('Salon: stage minutes always add up to the session length',()=>{
  for(let d=5;d<=180;d++){const plan=salon.stagePlan(d);assert.equal(plan.reduce((a,s)=>a+s.minutes,0),d,`duration ${d}`);assert.ok(plan.every(s=>s.minutes>=0))}
  assert.deepEqual(salon.stagePlan(40).map(s=>s.minutes),[6,6,10,12,6])
  assert.equal(salon.dialogueStages.reduce((a,s)=>a+s.share,0).toFixed(5),'1.00000')
 })

 await test('Salon: countdown uses correct Arabic number agreement',()=>{
  const m=60000,h=60*m,d=24*h
  assert.equal(salon.countdown(30000),'يبدأ الآن')
  assert.equal(salon.countdown(1*m+10),'بعد دقيقة')
  assert.equal(salon.countdown(2*m),'بعد دقيقتين')
  assert.equal(salon.countdown(5*m),'بعد ٥ دقائق')
  assert.equal(salon.countdown(15*m),'بعد ١٥ دقيقة')
  assert.equal(salon.countdown(2*h+30*m),'بعد ساعتين و٣٠ دقيقة')
  assert.equal(salon.countdown(1*d+h),'بعد يوم')
  assert.equal(salon.countdown(4*d),'بعد ٤ أيام')
  assert.equal(salon.countdown(12*d),'بعد ١٢ يومًا')
 })

 await test('Salon: preparation links resolve and skip deleted material',()=>{
  const idea=initialContent.ideas[0],writing=initialContent.writings[0]
  const items=salon.relatedItems(initialContent,at('x','2026-10-25T18:00:00+03:00',{relatedIds:[`idea:${idea.id}`,'writing:missing',`writing:${writing.id}`]}))
  assert.deepEqual(items.map(i=>i.href),[`/ideas/${encodeURIComponent(idea.id)}`,`/writings/${encodeURIComponent(writing.id)}`])
 })

 await test('Salon: new session fields validate and old sessions stay valid',()=>{
  const ok=at('v','2026-10-25T18:00:00+03:00',{prepare:'اقرأ النص قبل اللقاء',relatedIds:['idea:a','writing:b']})
  assert.equal(validContent({...initialContent,sessions:[at('old','2026-10-25T18:00:00+03:00')]}),true)
  assert.equal(validContent({...initialContent,sessions:[ok]}),true)
  for(const bad of [{prepare:'x'.repeat(2001)},{relatedIds:['book:a']},{relatedIds:['idea:a','idea:a']},{relatedIds:Array.from({length:7},(_,i)=>`idea:${i}`)},{relatedIds:['idea:has space']},{relatedIds:'idea:a'}])
   assert.equal(validContent({...initialContent,sessions:[{...ok,...bad}]}),false,JSON.stringify(bad))
 })

 await test('Salon: private notes and calendar links are well-formed',()=>{
  const good={position:'أميل إلى نعم',objection:'',change:'دراسة مضادة',confidence:70,savedAt:'2026-10-13T10:00:00.000Z'}
  assert.deepEqual(Object.keys(salon.restorePrep({a:good,b:{...good,confidence:200},c:'x'})),['a'])
  assert.deepEqual(salon.restorePrep([good]),{})
  const url=new URL(salon.googleCalendarUrl(at('c','2026-10-20T18:00:00+03:00')))
  assert.equal(url.hostname,'calendar.google.com')
  assert.equal(url.searchParams.get('dates'),'20261020T150000Z/20261020T160000Z')
 })

 await test('Salon: page renders method and charter; no page contains corrupted text',()=>{
  const html=render(initialContent,'/salon')
  for(const text of ['منهج المجلس','ميثاق الحوار','الإحسان في الفهم','المجلس ليس مناظرة'])assert.ok(html.includes(text),text)
  for(const path of [...publicPaths(initialContent),'/admin','/member'])assert.ok(!/\?{3,}/.test(render(initialContent,path).replace(/https?:\/\/[^"\s]*/g,'')),`corrupted text on ${path}`)
 })
}finally{await server.close()}
