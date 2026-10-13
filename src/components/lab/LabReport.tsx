import {useState} from 'react'
import {biases,consistencyNotes,criticalityLabels,evidenceBalance,evidenceTypes,focusAssumption,kinds,levelLabels,rankedAssumptions,reportText,type Exercise} from '../../lib/assumption-lab'
import {Signals} from './LabStep'

function download(name:string,body:string,type:string){const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)}

export function LabReport({exercise:e}:{exercise:Exercise}){
 const [copied,setCopied]=useState('')
 const balance=evidenceBalance(e.evidence)
 const focus=focusAssumption(e)
 const stamp=(e.completedAt??e.startedAt).slice(0,10)
 return <article className="lab-report" aria-labelledby="lab-report-title">
  <header><span className="section-label">تقرير مراجعة الموقف</span><h3 id="lab-report-title">{e.claim}</h3>{e.scope.trim()&&<p className="lab-note">النطاق: {e.scope}</p>}</header>
  <dl className="lab-report-facts">
   <div><dt>النوع</dt><dd>{kinds[e.kind].label}</dd></div>
   <div><dt>الاقتناع</dt><dd>{e.before.toLocaleString('ar-SA')}٪ ← {e.after.toLocaleString('ar-SA')}٪</dd></div>
   <div><dt>ميزان الأدلة</dt><dd>{balance.label}</dd></div>
  </dl>
  <section><h4>الافتراضات</h4><ul>{rankedAssumptions(e.assumptions).map(a=><li key={a.id}>{a.text} <small>— ثقة {levelLabels[a.confidence]}، إن سقط: {criticalityLabels[a.criticality]}{focus?.id===a.id&&' · محوري'}</small></li>)}</ul></section>
  <section><h4>أقوى اعتراض</h4><p className="preserve-lines">{e.objection}</p></section>
  <section><h4>الأدلة</h4><ul>{e.evidence.filter(x=>x.text.trim()).map(x=><li key={x.id}><span className={`lab-tag is-${x.direction}`}>{x.direction==='for'?'يؤيد':'يعارض'}</span> {x.text} <small>— {evidenceTypes[x.type].label}، موثوقية {levelLabels[x.strength]}</small></li>)}{e.noCounterEvidence&&<li><small>لم يُعثر على دليل معارض بعد البحث.</small></li>}</ul></section>
  <section><h4>معيار المراجعة</h4><p className="preserve-lines">{e.criterion}</p></section>
  <section><h4>تحيّزات محتملة</h4><p>{e.biases.length?e.biases.map(b=>biases[b].label).join('، '):'لم يُحدَّد'}</p>{e.biasReflection.trim()&&<p className="preserve-lines lab-note">{e.biasReflection}</p>}</section>
  <section><h4>الخلاصة</h4><p className="preserve-lines">{e.conclusion}</p></section>
  <section><h4>فحص الاتساق</h4><Signals items={consistencyNotes(e)}/></section>
  <div className="lab-actions">
   <button type="button" onClick={()=>{navigator.clipboard?.writeText(reportText(e)).then(()=>setCopied('نُسخ التقرير.'),()=>setCopied('تعذّر النسخ؛ استخدم التصدير النصي.'))}}>نسخ التقرير</button>
   <button type="button" onClick={()=>download(`kumeel-lab-${stamp}.txt`,reportText(e),'text/plain;charset=utf-8')}>تصدير نصّي ↓</button>
   <button type="button" onClick={()=>download(`kumeel-lab-${stamp}.json`,JSON.stringify(e,null,2),'application/json')}>تصدير JSON ↓</button>
   <span role="status" className="lab-note">{copied}</span>
  </div>
 </article>
}
