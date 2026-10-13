import type {Content,Session} from '../content'

// ---------- Schedule ----------
export type SessionState='upcoming'|'live'|'ended'|'cancelled'
export const sessionStart=(s:Session)=>Date.parse(s.startsAt)
export const sessionEnd=(s:Session)=>sessionStart(s)+s.durationMinutes*60000

export function sessionState(s:Session,now:number):SessionState{
 if(s.cancelled)return 'cancelled'
 if(now>=sessionEnd(s))return 'ended'
 return now>=sessionStart(s)?'live':'upcoming'
}

export type Schedule={live?:Session;next?:Session;later:Session[];cancelled:Session[];archive:Session[]}
// One source of truth for the page and the home card: live first, then the next
// upcoming session, then the rest; cancellations only while still in the future.
export function salonSchedule(sessions:Session[],now:number):Schedule{
 const byStart=[...sessions].sort((a,b)=>sessionStart(a)-sessionStart(b))
 const live=byStart.find(s=>sessionState(s,now)==='live')
 const upcoming=byStart.filter(s=>sessionState(s,now)==='upcoming')
 const next=live?undefined:upcoming[0]
 return {
  live,next,
  later:upcoming.filter(s=>s!==next),
  cancelled:byStart.filter(s=>s.cancelled&&sessionEnd(s)>now),
  archive:byStart.filter(s=>sessionState(s,now)==='ended').reverse(),
 }
}
export const hasArchiveMaterial=(s:Session)=>Boolean(s.summary?.trim()||s.recordingUrl||s.summaryPdfUrl)

// ---------- Time ----------
const ar=(n:number)=>n.toLocaleString('ar-SA')
function unit(n:number,one:string,two:string,few:string,many:string){return n===1?one:n===2?two:n<=10?`${ar(n)} ${few}`:`${ar(n)} ${many}`}
export function countdown(ms:number):string{
 if(ms<=60000)return 'يبدأ الآن'
 const minutes=Math.round(ms/60000),hours=Math.floor(minutes/60),days=Math.floor(hours/24)
 if(days>=1)return `بعد ${unit(days,'يوم','يومين','أيام','يومًا')}`
 if(hours>=1){const rest=minutes-hours*60;return `بعد ${unit(hours,'ساعة','ساعتين','ساعات','ساعة')}${rest?` و${unit(rest,'دقيقة','دقيقتين','دقائق','دقيقة')}`:''}`}
 return `بعد ${unit(minutes,'دقيقة','دقيقتين','دقائق','دقيقة')}`
}
export function formatSessionTime(s:Session,timeZone='Asia/Riyadh'){return new Intl.DateTimeFormat('ar-SA',{dateStyle:'full',timeStyle:'short',timeZone,calendar:'gregory'}).format(new Date(s.startsAt))}
export function platformName(url:string){try{const host=new URL(url).hostname;return host==='meet.google.com'?'Google Meet':/youtube\.com$|youtu\.be$/.test(host)?'YouTube':host}catch{return 'رابط اللقاء'}}

export function googleCalendarUrl(s:Session){
 const stamp=(t:number)=>new Date(t).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')
 const params=new URLSearchParams({action:'TEMPLATE',text:`${s.title} | مجلس الحوار`,dates:`${stamp(sessionStart(s))}/${stamp(sessionEnd(s))}`,details:`${s.question}\n\n${s.joinUrl}`,location:s.joinUrl})
 return `https://calendar.google.com/calendar/render?${params}`
}

// ---------- Method ----------
// The salon follows a dialectical arc: clarify the question, agree on terms,
// hear the strongest positions, give objection its full place, then name what
// changed. Shares are proportions of the announced duration.
export const dialogueStages=[
 {key:'question',label:'السؤال',share:.15,purpose:'نحدد السؤال بدقة، ونفصله عن الجواب الذي نميل إليه.'},
 {key:'concepts',label:'المفاهيم',share:.15,purpose:'نتفق على معنى الكلمات المفتاحية قبل أن نختلف على الحكم.'},
 {key:'positions',label:'المواقف',share:.25,purpose:'نعرض أقوى صيغة لكل رأي، كما يقبلها أصحابه.'},
 {key:'objection',label:'الاعتراض',share:.3,purpose:'نمنح الاعتراض مكانه الكامل: أين تضعف الحجة؟ وما الذي تغفله؟'},
 {key:'harvest',label:'ما تعلّمناه',share:.15,purpose:'ما الذي تغيّر فينا؟ وما السؤال الأفضل الذي نغادر به؟'},
] as const

// Largest-remainder rounding so the minutes always add up to the duration.
export function stagePlan(durationMinutes:number){
 const raw=dialogueStages.map(s=>s.share*durationMinutes)
 const minutes=raw.map(Math.floor)
 let left=durationMinutes-minutes.reduce((a,b)=>a+b,0)
 raw.map((v,i)=>({i,frac:v-Math.floor(v)})).sort((a,b)=>b.frac-a.frac).forEach(({i})=>{if(left>0){minutes[i]++;left--}})
 return dialogueStages.map((s,i)=>({...s,minutes:minutes[i]}))
}

export const charter=[
 ['الإحسان في الفهم','نفهم قول المخالف على أحسن وجوهه قبل أن نرد عليه.'],
 ['الفكرة لا الشخص','نناقش الحجة، ولا نحكم على قائلها.'],
 ['الدليل والمصدر','نطلب الدليل حين نسمع ادعاءً، ونذكر المصدر حين نستشهد.'],
 ['حق المراجعة','تغيير الرأي أمام حجة أقوى شجاعة لا هزيمة.'],
 ['سؤال أفضل','لا نشترط الاتفاق؛ يكفي أن نغادر بسؤال أدق مما جئنا به.'],
] as const

// ---------- Preparation links ----------
export type RelatedItem={id:string;title:string;href:string;kind:string}
export function relatedItems(content:Content,s:Session):RelatedItem[]{
 // References that no longer resolve (deleted idea or writing) are skipped.
 const items:RelatedItem[]=[]
 for(const ref of s.relatedIds??[]){
  const split=ref.indexOf(':'),kind=ref.slice(0,split),id=ref.slice(split+1)
  if(kind==='idea'){const i=(content.ideas??[]).find(x=>x.id===id);if(i)items.push({id:ref,title:i.title,href:`/ideas/${encodeURIComponent(i.id)}`,kind:i.kind})}
  else if(kind==='writing'){const w=content.writings.find(x=>x.id===id);if(w)items.push({id:ref,title:w.title,href:`/writings/${encodeURIComponent(w.id)}`,kind:w.category})}
 }
 return items
}

// ---------- Private preparation notes (this browser only) ----------
export const PREP_KEY='kumeel-salon-prep-v1'
export type PrepNote={position:string;objection:string;change:string;confidence:number;savedAt:string}
export const emptyPrep=():PrepNote=>({position:'',objection:'',change:'',confidence:50,savedAt:''})
export function validPrep(v:unknown):v is PrepNote{
 if(!v||typeof v!=='object')return false
 const p=v as PrepNote
 return ['position','objection','change'].every(k=>typeof (p as unknown as Record<string,unknown>)[k]==='string'&&String((p as unknown as Record<string,unknown>)[k]).length<=2000)&&Number.isFinite(p.confidence)&&p.confidence>=0&&p.confidence<=100&&typeof p.savedAt==='string'&&p.savedAt.length<=40
}
export function restorePrep(v:unknown):Record<string,PrepNote>{
 if(!v||typeof v!=='object'||Array.isArray(v))return {}
 return Object.fromEntries(Object.entries(v as Record<string,unknown>).filter(([id,note])=>id.length<=150&&validPrep(note)).slice(0,100)) as Record<string,PrepNote>
}
export const hasPrep=(p?:PrepNote)=>Boolean(p&&(p.position.trim()||p.objection.trim()||p.change.trim()))
