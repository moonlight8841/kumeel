import {useEffect,useId,useState} from 'react'
import type {Content,Session} from '../content'
import {downloadCalendar} from '../lib/calendar'
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
 return <p className="salon-time"><time dateTime={session.startsAt}>{formatSessionTime(session)}</time> <span>بتوقيت الرياض · {ar(session.durationMinutes)} دقيقة · {platformName(session.joinUrl)}</span>{local&&<span className="salon-local">في توقيتك: {local}</span>}</p>
}

function Prep({session,note,onSave,onRemove}:{session:Session;note?:PrepNote;onSave:(n:PrepNote)=>boolean;onRemove:()=>void}){
 const id=useId()
 const [open,setOpen]=useState(false)
 const [draft,setDraft]=useState<PrepNote>(note??emptyPrep())
 const [status,setStatus]=useState('')
 useEffect(()=>{if(note)setDraft(note)},[note])
 const field=(key:'position'|'objection'|'change',label:string,hint:string)=><label className="salon-field" htmlFor={`${id}-${key}`}><span>{label}</span><textarea id={`${id}-${key}`} rows={2} maxLength={2000} value={draft[key]} placeholder={hint} onChange={e=>{setDraft({...draft,[key]:e.target.value});setStatus('')}}/></label>
 return <div className="salon-prep">
  <button className="salon-prep-toggle" aria-expanded={open} aria-controls={`${id}-panel`} onClick={()=>setOpen(!open)}><span>{hasPrep(note)?'✓ موقفك محفوظ':'جهّز موقفك قبل اللقاء'}</span><small>تمرين خاص على هذا المتصفح، لا يُرسل ولا يُنشر</small></button>
  {open&&<form id={`${id}-panel`} className="salon-prep-form" onSubmit={e=>{e.preventDefault();setStatus(onSave({...draft,savedAt:new Date().toISOString()})?'حُفظ. سنعرضه لك بجانب ملخص اللقاء بعد انتهائه.':'تعذّر الحفظ على هذا المتصفح.')}}>
   <p className="salon-prep-question">«{session.question}»</p>
   {field('position','موقفي المبدئي','ما الذي أميل إليه الآن، ولماذا؟')}
   {field('objection','أقوى اعتراض أتوقعه','كيف سيصوغه من يخالفني بأفضل صورة؟')}
   {field('change','ما الذي قد يغيّر رأيي','دليل، مثال، أو حجة… حدّد شرطًا.')}
   <label className="salon-range"><span>درجة اقتناعي: <output>{ar(draft.confidence)}٪</output></span><input type="range" min={0} max={100} step={5} value={draft.confidence} onChange={e=>setDraft({...draft,confidence:Number(e.target.value)})}/></label>
   <div className="salon-prep-actions"><button className="primary" disabled={!hasPrep(draft)}>احفظ موقفي</button>{hasPrep(note)&&<button type="button" className="text-link" onClick={()=>{onRemove();setDraft(emptyPrep());setStatus('حُذف الموقف المحفوظ.')}}>احذف</button>}<span role="status">{status}</span></div>
  </form>}
 </div>
}

function Featured({session,live,now,content,note,onSave,onRemove}:{session:Session;live:boolean;now:number;content:Content;note?:PrepNote;onSave:(n:PrepNote)=>boolean;onRemove:()=>void}){
 const related=relatedItems(content,session)
 return <article className={`salon-featured${live?' is-live':''}`} aria-labelledby="salon-next-title">
  <div className="salon-badges"><span className={`salon-badge${live?' is-live':''}`}>{live?'يجري الآن':'اللقاء القادم'}</span>{!live&&<span className="salon-countdown">{countdown(sessionStart(session)-now)}</span>}</div>
  <h3 id="salon-next-title">{session.title}</h3>
  <p className="salon-question">{session.question}</p>
  <SessionTime session={session}/>
  {session.notes&&<p className="salon-notes preserve-lines">{session.notes}</p>}
  {(session.prepare||related.length>0)&&<div className="salon-before"><h4>قبل اللقاء</h4>{session.prepare&&<p className="preserve-lines">{session.prepare}</p>}{related.length>0&&<ul>{related.map(r=><li key={r.id}><a href={r.href}>{r.title}</a> <small>{r.kind}</small></li>)}</ul>}</div>}
  <div className="salon-actions">
   <a className="primary" href={session.joinUrl} target="_blank" rel="noopener noreferrer">{live?'ادخل اللقاء الآن':'افتح منصة اللقاء'} <span aria-hidden="true">↗</span></a>
   {session.registrationUrl&&<a className="text-link" href={session.registrationUrl} target="_blank" rel="noopener noreferrer">سجّل حضورك <span aria-hidden="true">↗</span></a>}
   {!live&&<><a className="text-link" href={googleCalendarUrl(session)} target="_blank" rel="noopener noreferrer">أضف إلى تقويم Google</a><button className="text-link" onClick={()=>downloadCalendar(session)}>ملف تقويم (ics)</button></>}
  </div>
  <Prep session={session} note={note} onSave={onSave} onRemove={onRemove}/>
 </article>
}

export function Salon({content}:{content:Content}){
 const now=useNow()
 const {notes,save,remove}=usePrepNotes()
 const sessions=content.sessions??[]
 const schedule=now===null?null:salonSchedule(sessions,now)
 const featured=schedule?.live??schedule?.next
 const plan=stagePlan(featured?.durationMinutes??40)
 return <section id="salon" className="salon" aria-labelledby="salon-title">
  <div className="wrap salon-wrap">
   <header className="salon-head">
    <span className="section-label">مجلس الحوار</span>
    <h2 id="salon-title">سؤال واحد.<br/>وأكثر من زاوية للنظر.</h2>
    <p>المجلس ليس مناظرة يربح فيها طرف. نبدأ بسؤال، ونفهم المخالف على أحسن وجوهه، ونمنح الاعتراض مكانه الكامل، ثم نغادر بسؤال أدق مما جئنا به.</p>
   </header>

   <div className="salon-schedule" aria-live="polite">
    {schedule===null?<ol className="salon-plain">{[...sessions].filter(s=>!s.cancelled).sort((a,b)=>sessionStart(a)-sessionStart(b)).map(s=><li key={s.id}><strong>{s.title}</strong><p>{s.question}</p><time dateTime={s.startsAt}>{formatSessionTime(s)} · بتوقيت الرياض</time></li>)}</ol>
    :featured?<Featured session={featured} live={Boolean(schedule.live)} now={now!} content={content} note={notes[featured.id]} onSave={n=>save(featured.id,n)} onRemove={()=>remove(featured.id)}/>
    :<div className="salon-empty"><h3>المجلس يبدأ حين يستحق السؤال.</h3><p>لا يوجد موعد معلن الآن. سيظهر هنا اللقاء القادم برابطه وموعده، ومعه ما يُقرأ قبله.</p></div>}
    {schedule&&(schedule.later.length>0||schedule.cancelled.length>0)&&<div className="salon-later"><h3>مواعيد لاحقة</h3><ul>{schedule.later.map(s=><li key={s.id}><strong>{s.title}</strong><time dateTime={s.startsAt}>{formatSessionTime(s)}</time><small>{countdown(sessionStart(s)-now!)}</small></li>)}{schedule.cancelled.map(s=><li key={s.id} className="is-cancelled"><strong>{s.title}</strong><time dateTime={s.startsAt}>{formatSessionTime(s)}</time><small>أُلغي هذا الموعد</small></li>)}</ul></div>}
   </div>

   <section className="salon-method" aria-labelledby="salon-method-title">
    <h3 id="salon-method-title">منهج المجلس</h3>
    <p className="salon-muted">خمس مراحل تتوزّع على مدة اللقاء{featured?` (${ar(featured.durationMinutes)} دقيقة)`:''}. الزمن دليل لا قيد؛ قد يطول الاعتراض إن كان يستحق.</p>
    <ol className="salon-stages">{plan.map((s,i)=><li key={s.key} style={{flexGrow:s.minutes}}><span className="salon-stage-index">{ar(i+1)}</span><strong>{s.label}</strong><small>{ar(s.minutes)} د</small><p>{s.purpose}</p></li>)}</ol>
   </section>

   <section className="salon-charter" aria-labelledby="salon-charter-title">
    <h3 id="salon-charter-title">ميثاق الحوار</h3>
    <dl>{charter.map(([title,text])=><div key={title}><dt>{title}</dt><dd>{text}</dd></div>)}</dl>
   </section>

   {schedule&&<section className="salon-archive" aria-labelledby="salon-archive-title">
    <h3 id="salon-archive-title">أرشيف المجلس: ما بقي بعد اللقاء</h3>
    {schedule.archive.length?<ol>{schedule.archive.map(s=>{const note=notes[s.id];return <li key={s.id}><article>
     <header><h4>{s.title}</h4><time dateTime={s.startsAt}>{formatSessionTime(s)}</time></header>
     <p className="salon-question is-small">{s.question}</p>
     {s.summary?.trim()&&<p className="preserve-lines salon-summary">{s.summary}</p>}{!hasArchiveMaterial(s)&&<p className="salon-muted">لم يُنشر ملخص هذا اللقاء بعد.</p>}
     {(s.recordingUrl||s.summaryPdfUrl)&&<div className="salon-actions">{s.recordingUrl&&<a className="text-link" href={s.recordingUrl} target="_blank" rel="noopener noreferrer">شاهد التسجيل <span aria-hidden="true">↗</span></a>}{s.summaryPdfUrl&&<a className="text-link" href={s.summaryPdfUrl} target="_blank" rel="noopener noreferrer">الملخص بصيغة PDF <span aria-hidden="true">↗</span></a>}</div>}
     {hasPrep(note)&&<aside className="salon-compare"><h5>موقفك قبل اللقاء <small>({ar(note.confidence)}٪)</small></h5>{note.position&&<p>{note.position}</p>}{note.change&&<p><b>قلتَ إن ما قد يغيّر رأيك:</b> {note.change}</p>}<p className="salon-muted">بعد ما سمعت: ما الذي تغيّر؟ وما الذي ثبت؟</p></aside>}
    </article></li>})}</ol>:<p className="salon-muted">سيظهر هنا ملخص كل لقاء وتسجيله بعد انتهائه.</p>}
   </section>}

   <p className="salon-footnote">تُعقد اللقاءات عبر Google Meet أو YouTube، ويبقى قبول المشاركين وإدارة اللقاء بيد المضيف على منصة اللقاء.</p>
  </div>
 </section>
}
