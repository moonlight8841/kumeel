import {L} from '../lib/locale-ui'
import {useEffect,useReducer,useRef,useState} from 'react'
import type {Idea} from '../content'
import {STORAGE,addToHistory,completedSteps,emptyExercise,exerciseFromIdea,labReducer,migrate,reachableStep,restoreHistory,stepComplete,stepRequirement,steps,type Exercise} from '../lib/assumption-lab'
import {LabStep} from './lab/LabStep'
import {LabReport} from './lab/LabReport'

function read(key:string):unknown{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
function write(key:string,value:unknown){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
const hasWork=(e:Exercise)=>Boolean(e.claim.trim()||e.objection.trim()||e.assumptions.length||e.evidence.length)

export function AssumptionLab({ideas,selected}:{ideas:Idea[];selected:Idea|null}){
 // A fixed id keeps SSR and hydration identical; the real exercise loads after mount.
 const [exercise,dispatch]=useReducer(labReducer,undefined,()=>emptyExercise(new Date(0),'pending'))
 const [step,setStep]=useState(0)
 const [ready,setReady]=useState(false)
 const [pending,setPending]=useState<Idea|null>(null)
 const [history,setHistory]=useState<Exercise[]>([])
 const [message,setMessage]=useState('')
 const formRef=useRef<HTMLDivElement>(null)

 useEffect(()=>{
  // Prefer v2 storage; otherwise migrate the v1 exercise and history once.
  const saved=migrate(read(STORAGE.current))??migrate(read(STORAGE.legacyCurrent))
  const past=restoreHistory(read(STORAGE.history)??read(STORAGE.legacyHistory))
  setHistory(past)
  let next=saved??emptyExercise()
  const idea=ideas.find(i=>i.id===new URLSearchParams(location.search).get('idea'))
  if(idea){if(saved&&hasWork(saved))setPending(idea);else next=exerciseFromIdea(idea)}
  dispatch({type:'load',exercise:next})
  setStep(next.completedAt?steps.length-1:reachableStep(next))
  setReady(true)
 // Restore once; refreshed public content must not overwrite a private exercise.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[])
 useEffect(()=>{if(selected){setPending(selected);document.getElementById('assumption-lab')?.scrollIntoView({behavior:'smooth',block:'start'})}},[selected])
 useEffect(()=>{if(ready&&!write(STORAGE.current,exercise))setMessage('تعذّر الحفظ المحلي. صدّر التمرين للاحتفاظ به.')},[exercise,ready])

 const reachable=reachableStep(exercise)
 const current=steps[step]
 const done=stepComplete(exercise,current.key)
 const completed=completedSteps(exercise)
 const finished=Boolean(exercise.completedAt)

 function goTo(index:number){if(index>reachable&&!finished)return;setStep(index);setMessage('');formRef.current?.focus({preventScroll:true})}
 function start(idea?:Idea){dispatch({type:'load',exercise:idea?exerciseFromIdea(idea):emptyExercise()});setStep(0);setPending(null);setMessage('بدأ تمرين جديد.')}
 function finish(){
  if(completed<steps.length){const first=steps.findIndex(s=>!stepComplete(exercise,s.key));setStep(first);setMessage(stepRequirement[steps[first].key]);return}
  const at=new Date().toISOString()
  const done={...exercise,completedAt:at}
  dispatch({type:'complete',at})
  const next=addToHistory(history,done)
  setHistory(next)
  setMessage(write(STORAGE.history,next)?'اكتمل التمرين وحُفظ في سجلّك على هذا المتصفح.':'اكتمل التقرير، لكن تعذّر حفظ السجل. صدّره قبل المغادرة.')
 }

 return <L.section id="assumption-lab" className="assumption-lab guided-lab" aria-labelledby="lab-title">
  <L.div className="lab-aside">
   <L.span className="section-label">مختبر الافتراضات</L.span>
   <L.h2 id="lab-title">من قناعة أولى<L.br/>إلى موقف أوضح.</L.h2>
   <L.p>لا نحكم على صحة رأيك. نفكّك الادعاء إلى افتراضاته، ونزن الأدلة من الجهتين، ونحدّد ما الذي قد يغيّر موقفك.</L.p>
   <L.small>تمرين خاص محفوظ على هذا المتصفح فقط؛ لا يُرسل إلى أي خدمة ولا يُنشر.</L.small>
   {exercise.source&&<L.div className="lab-source-card"><L.span>الفكرة</L.span><L.strong>{exercise.source.title}</L.strong>{exercise.source.question&&<L.p>{exercise.source.question}</L.p>}</L.div>}
   <L.div className="lab-progress"><L.span>{completed.toLocaleString('ar-SA')} من {steps.length.toLocaleString('ar-SA')} مراحل</L.span><L.progress aria-label="المراحل المستوفاة" value={completed} max={steps.length}/></L.div>
   <L.nav className="lab-steps" aria-label="مراحل المختبر">{steps.map((s,i)=>{const ok=stepComplete(exercise,s.key);const locked=i>reachable&&!finished;return <L.button key={s.key} type="button" aria-current={step===i?'step':undefined} aria-disabled={locked||undefined} data-done={ok||undefined} onClick={()=>goTo(i)}><L.span className="lab-step-mark" aria-hidden="true">{ok?'✓':(i+1).toLocaleString('ar-SA')}</L.span>{s.label}{locked&&<L.span className="sr-only"> (مقفلة حتى تكمل ما قبلها)</L.span>}</L.button>})}</L.nav>
   <L.button type="button" className="lab-ghost" onClick={()=>{if(!hasWork(exercise)||window.confirm('بدء تمرين جديد؟ سيُستبدل التمرين الجاري، وتبقى التمارين المكتملة في السجل.'))start()}}>تمرين جديد</L.button>
   {history.length>0&&<L.details className="lab-history"><L.summary>سجل التمارين المكتملة ({history.length.toLocaleString('ar-SA')})</L.summary><L.ul>{history.map(h=><L.li key={h.id}><L.button type="button" onClick={()=>{if(!hasWork(exercise)||window.confirm('فتح هذا التمرين بدل الجاري؟')){dispatch({type:'load',exercise:h});setStep(steps.length-1);setMessage('')}}}><L.span>{h.claim.slice(0,70)}</L.span><L.small>{h.completedAt?new Date(h.completedAt).toLocaleDateString('ar-SA',{calendar:'gregory'}):''} · {h.before}٪ ← {h.after}٪</L.small></L.button></L.li>)}</L.ul><L.button type="button" className="lab-ghost" onClick={()=>{if(window.confirm('مسح سجل التمارين المكتملة؟')){setHistory([]);try{localStorage.removeItem(STORAGE.history);localStorage.removeItem(STORAGE.legacyHistory)}catch{setMessage('تعذّر مسح السجل المحلي.')}}}}>مسح السجل</L.button></L.details>}
  </L.div>
  <L.div className="lab-main">
   {pending&&<L.aside className="mind-feedback"><L.p>وصلت فكرة «{pending.title}». تمرينك الحالي محفوظ حتى تختار.</L.p><L.button type="button" onClick={()=>{if(!hasWork(exercise)||window.confirm('استبدال التمرين الجاري بالفكرة المختارة؟'))start(pending)}}>ابدأ بهذه الفكرة</L.button><L.button type="button" onClick={()=>setPending(null)}>احتفظ بتمرينك</L.button></L.aside>}
   {finished?<LabReport exercise={exercise}/>:<L.form onSubmit={ev=>{ev.preventDefault();if(!done){setMessage(stepRequirement[current.key]);return}if(step<steps.length-1)goTo(step+1);else finish()}}>
    <L.div ref={formRef} tabIndex={-1} className="lab-step-head"><L.span>المرحلة {(step+1).toLocaleString('ar-SA')} من {steps.length.toLocaleString('ar-SA')}</L.span><L.h3>{current.label}</L.h3></L.div>
    {ready?<LabStep exercise={exercise} step={current.key} dispatch={dispatch}/>:<L.p className="lab-note">جارٍ تحميل تمرينك…</L.p>}
    <L.div className="lab-actions"><L.button type="button" disabled={step===0} onClick={()=>goTo(step-1)}>السابق</L.button><L.button className="primary" aria-disabled={!done||undefined}>{step===steps.length-1?'أكمل التقرير واحفظه':'التالي ←'}</L.button>{!done&&<L.span className="lab-note">{stepRequirement[current.key]}</L.span>}</L.div>
   </L.form>}
   {finished&&<L.div className="lab-actions"><L.button type="button" onClick={()=>{dispatch({type:'set',patch:{}});setStep(steps.length-1)}}>عدّل التمرين</L.button></L.div>}
   <L.p role="status" className="lab-status">{message||'يُحفظ كل تعديل محليًا تلقائيًا.'}</L.p>
  </L.div>
 </L.section>
}
