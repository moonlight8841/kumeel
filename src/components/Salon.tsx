import {L} from '../lib/locale-ui'
import {useEffect,useId,useState} from 'react'
import type {Content,Session} from '../content'
import {downloadCalendar} from '../lib/calendar'
import {MajlisChat} from './MajlisChat'
import {PREP_KEY,charter,countdown,emptyPrep,formatSessionTime,googleCalendarUrl,hasArchiveMaterial,hasPrep,platformName,relatedItems,restorePrep,salonSchedule,sessionStart,stagePlan,type PrepNote} from '../lib/salon'

const ar=(n:number)=>n.toLocaleString('ar-SA')

function useNow(){
 const [now,setNow]=useState<number|null>(null)
 useEffect(()=>{setNow(Date.now());const t=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(t)},[])
 return now
}

function usePrepNotes(){
 const [notes,setNotes]=useState<Record<string,PrepNote>>({})
 useEffect(()=>{try{setNotes(restorePrep(JSON.parse(localStorage.getItem(PREP_KEY)||'{}')))}catch{/* Private notes are optional. */}},[])
 function save(id:string,note:PrepNote){const next={...notes,[id]:note};setNotes(next);try{localStorage.setItem(PREP_KEY,JSON.stringify(next));return true}catch{return false}}
 function remove(id:string){const {[id]:_,...rest}=notes;void _;setNotes(rest);try{localStorage.setItem(PREP_KEY,JSON.stringify(rest))}catch{/* Memory only. */}}
 return {notes,save,remove}
}

function SessionTime({session}:{session:Session}){
 const [local,setLocal]=useState('')
 // Show the visitor's own time when it differs from Riyadh.
 useEffect(()=>{const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;if(zone&&zone!=='Asia/Riyadh'&&new Date(session.startsAt).toLocaleString('en',{timeZone:zone,hour:'numeric'})!==new Date(session.startsAt).toLocaleString('en',{timeZone:'Asia/Riyadh',hour:'numeric'}))setLocal(formatSessionTime(session,zone))},[session])
 return <L.p className="salon-time"><L.time dateTime={session.startsAt}>{formatSessionTime(session)}</L.time> <L.span>بتوقيت الرياض · {ar(session.durationMinutes)} دقيقة · {platformName(session.joinUrl)}</L.span>{local&&<L.span className="salon-local">في توقيتك: {local}</L.span>}</L.p>
}

function Prep({session,note,onSave,onRemove}:{session:Session;note?:PrepNote;onSave:(n:PrepNote)=>boolean;onRemove:()=>void}){
 const id=useId()
 const [open,setOpen]=useState(false)
 const [draft,setDraft]=useState<PrepNote>(note??emptyPrep())
 const [status,setStatus]=useState('')
 useEffect(()=>{if(note)setDraft(note)},[note])
 const field=(key:'position'|'objection'|'change',label:string,hint:string)=><L.label className="salon-field" htmlFor={`${id}-${key}`}><L.span>{label}</L.span><L.textarea id={`${id}-${key}`} rows={2} maxLength={2000} value={draft[key]} placeholder={hint} onChange={e=>{setDraft({...draft,[key]:e.target.value});setStatus('')}}/></L.label>
 return <L.div className="salon-prep">
  <L.button className="salon-prep-toggle" aria-expanded={open} aria-controls={`${id}-panel`} onClick={()=>setOpen(!open)}><L.span>{hasPrep(note)?'✓ موقفك محفوظ':'جهّز موقفك قبل اللقاء'}</L.span><L.small>تمرين خاص على هذا المتصفح، لا يُرسل ولا يُنشر</L.small></L.button>
  {open&&<L.form id={`${id}-panel`} className="salon-prep-form" onSubmit={e=>{e.preventDefault();setStatus(onSave({...draft,savedAt:new Date().toISOString()})?'حُفظ. سنعرضه لك بجانب ملخص اللقاء بعد انتهائه.':'تعذّر الحفظ على هذا المتصفح.')}}>
   <L.p className="salon-prep-question">«{session.question}»</L.p>
   {field('position','موقفي المبدئي','ما الذي أميل إليه الآن، ولماذا؟')}
   {field('objection','أقوى اعتراض أتوقعه','كيف سيصوغه من يخالفني بأفضل صورة؟')}
   {field('change','ما الذي قد يغيّر رأيي','دليل، مثال، أو حجة… حدّد شرطًا.')}
   <L.label className="salon-range"><L.span>درجة اقتناعي: <L.output>{ar(draft.confidence)}٪</L.output></L.span><L.input type="range" min={0} max={100} step={5} value={draft.confidence} onChange={e=>setDraft({...draft,confidence:Number(e.target.value)})}/></L.label>
   <L.div className="salon-prep-actions"><L.button className="primary" disabled={!hasPrep(draft)}>احفظ موقفي</L.button>{hasPrep(note)&&<L.button type="button" className="text-link" onClick={()=>{onRemove();setDraft(emptyPrep());setStatus('حُذف الموقف المحفوظ.')}}>احذف</L.button>}<L.span role="status">{status}</L.span></L.div>
  </L.form>}
 </L.div>
}

function Featured({session,live,now,content,note,onSave,onRemove}:{session:Session;live:boolean;now:number;content:Content;note?:PrepNote;onSave:(n:PrepNote)=>boolean;onRemove:()=>void}){
 const related=relatedItems(content,session)
 return <L.article className={`salon-featured${live?' is-live':''}`} aria-labelledby="salon-next-title">
  <L.div className="salon-badges"><L.span className={`salon-badge${live?' is-live':''}`}>{live?'يجري الآن':'اللقاء القادم'}</L.span>{!live&&<L.span className="salon-countdown">{countdown(sessionStart(session)-now)}</L.span>}</L.div>
  <L.h3 id="salon-next-title">{session.title}</L.h3>
  <L.p className="salon-question">{session.question}</L.p>
  <SessionTime session={session}/>
  {session.notes&&<L.p className="salon-notes preserve-lines">{session.notes}</L.p>}
  {(session.prepare||related.length>0)&&<L.div className="salon-before"><L.h4>قبل اللقاء</L.h4>{session.prepare&&<L.p className="preserve-lines">{session.prepare}</L.p>}{related.length>0&&<L.ul>{related.map(r=><L.li key={r.id}><L.a href={r.href}>{r.title}</L.a> <L.small>{r.kind}</L.small></L.li>)}</L.ul>}</L.div>}
  <L.div className="salon-actions">
   <L.a className="primary" href={session.joinUrl} target="_blank" rel="noopener noreferrer">{live?'ادخل اللقاء الآن':'افتح منصة اللقاء'} <L.span aria-hidden="true">↗</L.span></L.a>
   {session.registrationUrl&&<L.a className="text-link" href={session.registrationUrl} target="_blank" rel="noopener noreferrer">سجّل حضورك <L.span aria-hidden="true">↗</L.span></L.a>}
   {!live&&<><L.a className="text-link" href={googleCalendarUrl(session)} target="_blank" rel="noopener noreferrer">أضف إلى تقويم Google</L.a><L.button className="text-link" onClick={()=>downloadCalendar(session)}>ملف تقويم (ics)</L.button></>}
  </L.div>
  <Prep session={session} note={note} onSave={onSave} onRemove={onRemove}/>
 </L.article>
}

export function Salon({content}:{content:Content}){
 const now=useNow()
 const {notes,save,remove}=usePrepNotes()
 const sessions=content.sessions??[]
 const schedule=now===null?null:salonSchedule(sessions,now)
 const featured=schedule?.live??schedule?.next
 const plan=stagePlan(featured?.durationMinutes??40)
 return <L.section id="salon" className="salon" aria-labelledby="salon-title">
  <L.div className="wrap salon-wrap">
   <L.header className="salon-head">
    <L.span className="section-label">مجلس الحوار</L.span>
    <L.h2 id="salon-title">سؤال واحد.<L.br/>وأكثر من زاوية للنظر.</L.h2>
    <L.p>المجلس ليس مناظرة يربح فيها طرف. نبدأ بسؤال، ونفهم المخالف على أحسن وجوهه، ونمنح الاعتراض مكانه الكامل، ثم نغادر بسؤال أدق مما جئنا به.</L.p>
   </L.header>

   <L.div className="salon-schedule" aria-live="polite">
    {schedule===null?<L.ol className="salon-plain">{[...sessions].filter(s=>!s.cancelled).sort((a,b)=>sessionStart(a)-sessionStart(b)).map(s=><L.li key={s.id}><L.strong>{s.title}</L.strong><L.p>{s.question}</L.p><L.time dateTime={s.startsAt}>{formatSessionTime(s)} · بتوقيت الرياض</L.time></L.li>)}</L.ol>
    :featured?<Featured session={featured} live={Boolean(schedule.live)} now={now!} content={content} note={notes[featured.id]} onSave={n=>save(featured.id,n)} onRemove={()=>remove(featured.id)}/>
    :<L.div className="salon-empty"><L.h3>المجلس يبدأ حين يستحق السؤال.</L.h3><L.p>لا يوجد موعد معلن الآن. سيظهر هنا اللقاء القادم برابطه وموعده، ومعه ما يُقرأ قبله.</L.p></L.div>}
    {schedule&&(schedule.later.length>0||schedule.cancelled.length>0)&&<L.div className="salon-later"><L.h3>مواعيد لاحقة</L.h3><L.ul>{schedule.later.map(s=><L.li key={s.id}><L.strong>{s.title}</L.strong><L.time dateTime={s.startsAt}>{formatSessionTime(s)}</L.time><L.small>{countdown(sessionStart(s)-now!)}</L.small></L.li>)}{schedule.cancelled.map(s=><L.li key={s.id} className="is-cancelled"><L.strong>{s.title}</L.strong><L.time dateTime={s.startsAt}>{formatSessionTime(s)}</L.time><L.small>أُلغي هذا الموعد</L.small></L.li>)}</L.ul></L.div>}
   </L.div>

   <L.section className="salon-method" aria-labelledby="salon-method-title">
    <L.h3 id="salon-method-title">منهج المجلس</L.h3>
    <L.p className="salon-muted">خمس مراحل تتوزّع على مدة اللقاء{featured?` (${ar(featured.durationMinutes)} دقيقة)`:''}. الزمن دليل لا قيد؛ قد يطول الاعتراض إن كان يستحق.</L.p>
    <L.ol className="salon-stages">{plan.map((s,i)=><L.li key={s.key} style={{flexGrow:s.minutes}}><L.span className="salon-stage-index">{ar(i+1)}</L.span><L.strong>{s.label}</L.strong><L.small>{ar(s.minutes)} د</L.small><L.p>{s.purpose}</L.p></L.li>)}</L.ol>
   </L.section>

   <L.section className="salon-charter" aria-labelledby="salon-charter-title">
    <L.h3 id="salon-charter-title">ميثاق الحوار</L.h3>
    <L.dl>{charter.map(([title,text])=><L.div key={title}><L.dt>{title}</L.dt><L.dd>{text}</L.dd></L.div>)}</L.dl>
   </L.section>

   <MajlisChat/>

   {schedule&&<L.section className="salon-archive" aria-labelledby="salon-archive-title">
    <L.h3 id="salon-archive-title">أرشيف المجلس: ما بقي بعد اللقاء</L.h3>
    {schedule.archive.length?<L.ol>{schedule.archive.map(s=>{const note=notes[s.id];return <L.li key={s.id}><L.article>
     <L.header><L.h4>{s.title}</L.h4><L.time dateTime={s.startsAt}>{formatSessionTime(s)}</L.time></L.header>
     <L.p className="salon-question is-small">{s.question}</L.p>
     {s.summary?.trim()&&<L.p className="preserve-lines salon-summary">{s.summary}</L.p>}{!hasArchiveMaterial(s)&&<L.p className="salon-muted">لم يُنشر ملخص هذا اللقاء بعد.</L.p>}
     {(s.recordingUrl||s.summaryPdfUrl)&&<L.div className="salon-actions">{s.recordingUrl&&<L.a className="text-link" href={s.recordingUrl} target="_blank" rel="noopener noreferrer">شاهد التسجيل <L.span aria-hidden="true">↗</L.span></L.a>}{s.summaryPdfUrl&&<L.a className="text-link" href={s.summaryPdfUrl} target="_blank" rel="noopener noreferrer">الملخص بصيغة PDF <L.span aria-hidden="true">↗</L.span></L.a>}</L.div>}
     {hasPrep(note)&&<L.aside className="salon-compare"><L.h5>موقفك قبل اللقاء <L.small>({ar(note.confidence)}٪)</L.small></L.h5>{note.position&&<L.p>{note.position}</L.p>}{note.change&&<L.p><L.b>قلتَ إن ما قد يغيّر رأيك:</L.b> {note.change}</L.p>}<L.p className="salon-muted">بعد ما سمعت: ما الذي تغيّر؟ وما الذي ثبت؟</L.p></L.aside>}
    </L.article></L.li>})}</L.ol>:<L.p className="salon-muted">سيظهر هنا ملخص كل لقاء وتسجيله بعد انتهائه.</L.p>}
   </L.section>}

   <L.p className="salon-footnote">تُعقد اللقاءات عبر Google Meet أو YouTube، ويبقى قبول المشاركين وإدارة اللقاء بيد المضيف على منصة اللقاء.</L.p>
  </L.div>
 </L.section>
}
