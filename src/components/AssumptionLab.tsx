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

 return <section id="assumption-lab" className="assumption-lab guided-lab" aria-labelledby="lab-title">
  <div className="lab-aside">
   <span className="section-label">مختبر الافتراضات</span>
   <h2 id="lab-title">من قناعة أولى<br/>إلى موقف أوضح.</h2>
   <p>لا نحكم على صحة رأيك. نفكّك الادعاء إلى افتراضاته، ونزن الأدلة من الجهتين، ونحدّد ما الذي قد يغيّر موقفك.</p>
   <small>تمرين خاص محفوظ على هذا المتصفح فقط؛ لا يُرسل إلى أي خدمة ولا يُنشر.</small>
   {exercise.source&&<div className="lab-source-card"><span>الفكرة</span><strong>{exercise.source.title}</strong>{exercise.source.question&&<p>{exercise.source.question}</p>}</div>}
   <div className="lab-progress"><span>{completed.toLocaleString('ar-SA')} من {steps.length.toLocaleString('ar-SA')} مراحل</span><progress aria-label="المراحل المستوفاة" value={completed} max={steps.length}/></div>
   <nav className="lab-steps" aria-label="مراحل المختبر">{steps.map((s,i)=>{const ok=stepComplete(exercise,s.key);const locked=i>reachable&&!finished;return <button key={s.key} type="button" aria-current={step===i?'step':undefined} aria-disabled={locked||undefined} data-done={ok||undefined} onClick={()=>goTo(i)}><span className="lab-step-mark" aria-hidden="true">{ok?'✓':(i+1).toLocaleString('ar-SA')}</span>{s.label}{locked&&<span className="sr-only"> (مقفلة حتى تكمل ما قبلها)</span>}</button>})}</nav>
   <button type="button" className="lab-ghost" onClick={()=>{if(!hasWork(exercise)||window.confirm('بدء تمرين جديد؟ سيُستبدل التمرين الجاري، وتبقى التمارين المكتملة في السجل.'))start()}}>تمرين جديد</button>
   {history.length>0&&<details className="lab-history"><summary>سجل التمارين المكتملة ({history.length.toLocaleString('ar-SA')})</summary><ul>{history.map(h=><li key={h.id}><button type="button" onClick={()=>{if(!hasWork(exercise)||window.confirm('فتح هذا التمرين بدل الجاري؟')){dispatch({type:'load',exercise:h});setStep(steps.length-1);setMessage('')}}}><span>{h.claim.slice(0,70)}</span><small>{h.completedAt?new Date(h.completedAt).toLocaleDateString('ar-SA',{calendar:'gregory'}):''} · {h.before}٪ ← {h.after}٪</small></button></li>)}</ul><button type="button" className="lab-ghost" onClick={()=>{if(window.confirm('مسح سجل التمارين المكتملة؟')){setHistory([]);try{localStorage.removeItem(STORAGE.history);localStorage.removeItem(STORAGE.legacyHistory)}catch{setMessage('تعذّر مسح السجل المحلي.')}}}}>مسح السجل</button></details>}
  </div>
  <div className="lab-main">
   {pending&&<aside className="mind-feedback"><p>وصلت فكرة «{pending.title}». تمرينك الحالي محفوظ حتى تختار.</p><button type="button" onClick={()=>{if(!hasWork(exercise)||window.confirm('استبدال التمرين الجاري بالفكرة المختارة؟'))start(pending)}}>ابدأ بهذه الفكرة</button><button type="button" onClick={()=>setPending(null)}>احتفظ بتمرينك</button></aside>}
   {finished?<LabReport exercise={exercise}/>:<form onSubmit={ev=>{ev.preventDefault();if(!done){setMessage(stepRequirement[current.key]);return}if(step<steps.length-1)goTo(step+1);else finish()}}>
    <div ref={formRef} tabIndex={-1} className="lab-step-head"><span>المرحلة {(step+1).toLocaleString('ar-SA')} من {steps.length.toLocaleString('ar-SA')}</span><h3>{current.label}</h3></div>
    {ready?<LabStep exercise={exercise} step={current.key} dispatch={dispatch}/>:<p className="lab-note">جارٍ تحميل تمرينك…</p>}
    <div className="lab-actions"><button type="button" disabled={step===0} onClick={()=>goTo(step-1)}>السابق</button><button className="primary" aria-disabled={!done||undefined}>{step===steps.length-1?'أكمل التقرير واحفظه':'التالي ←'}</button>{!done&&<span className="lab-note">{stepRequirement[current.key]}</span>}</div>
   </form>}
   {finished&&<div className="lab-actions"><button type="button" onClick={()=>{dispatch({type:'set',patch:{}});setStep(steps.length-1)}}>عدّل التمرين</button></div>}
   <p role="status" className="lab-status">{message||'يُحفظ كل تعديل محليًا تلقائيًا.'}</p>
  </div>
 </section>
}
