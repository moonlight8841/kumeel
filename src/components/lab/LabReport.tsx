import {L} from '../../lib/locale-ui'
import {useState} from 'react'
import {biases,consistencyNotes,criticalityLabels,evidenceBalance,evidenceTypes,focusAssumption,kinds,levelLabels,rankedAssumptions,reportText,type Exercise} from '../../lib/assumption-lab'
import {Signals} from './LabStep'

function download(name:string,body:string,type:string){const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)}

export function LabReport({exercise:e}:{exercise:Exercise}){
 const [copied,setCopied]=useState('')
 const balance=evidenceBalance(e.evidence)
 const focus=focusAssumption(e)
 const stamp=(e.completedAt??e.startedAt).slice(0,10)
 return <L.article className="lab-report" aria-labelledby="lab-report-title">
  <L.header><L.span className="section-label">تقرير مراجعة الموقف</L.span><L.h3 id="lab-report-title">{e.claim}</L.h3>{e.scope.trim()&&<L.p className="lab-note">النطاق: {e.scope}</L.p>}</L.header>
  <L.dl className="lab-report-facts">
   <L.div><L.dt>النوع</L.dt><L.dd>{kinds[e.kind].label}</L.dd></L.div>
   <L.div><L.dt>الاقتناع</L.dt><L.dd>{e.before.toLocaleString('ar-SA')}٪ ← {e.after.toLocaleString('ar-SA')}٪</L.dd></L.div>
   <L.div><L.dt>ميزان الأدلة</L.dt><L.dd>{balance.label}</L.dd></L.div>
  </L.dl>
  <L.section><L.h4>الافتراضات</L.h4><L.ul>{rankedAssumptions(e.assumptions).map(a=><L.li key={a.id}>{a.text} <L.small>— ثقة {levelLabels[a.confidence]}، إن سقط: {criticalityLabels[a.criticality]}{focus?.id===a.id&&' · محوري'}</L.small></L.li>)}</L.ul></L.section>
  <L.section><L.h4>أقوى اعتراض</L.h4><L.p className="preserve-lines">{e.objection}</L.p></L.section>
  <L.section><L.h4>الأدلة</L.h4><L.ul>{e.evidence.filter(x=>x.text.trim()).map(x=><L.li key={x.id}><L.span className={`lab-tag is-${x.direction}`}>{x.direction==='for'?'يؤيد':'يعارض'}</L.span> {x.text} <L.small>— {evidenceTypes[x.type].label}، موثوقية {levelLabels[x.strength]}</L.small></L.li>)}{e.noCounterEvidence&&<L.li><L.small>لم يُعثر على دليل معارض بعد البحث.</L.small></L.li>}</L.ul></L.section>
  <L.section><L.h4>معيار المراجعة</L.h4><L.p className="preserve-lines">{e.criterion}</L.p></L.section>
  <L.section><L.h4>تحيّزات محتملة</L.h4><L.p>{e.biases.length?e.biases.map(b=>biases[b].label).join('، '):'لم يُحدَّد'}</L.p>{e.biasReflection.trim()&&<L.p className="preserve-lines lab-note">{e.biasReflection}</L.p>}</L.section>
  <L.section><L.h4>الخلاصة</L.h4><L.p className="preserve-lines">{e.conclusion}</L.p></L.section>
  <L.section><L.h4>فحص الاتساق</L.h4><Signals items={consistencyNotes(e)}/></L.section>
  <L.div className="lab-actions">
   <L.button type="button" onClick={()=>{navigator.clipboard?.writeText(reportText(e)).then(()=>setCopied('نُسخ التقرير.'),()=>setCopied('تعذّر النسخ؛ استخدم التصدير النصي.'))}}>نسخ التقرير</L.button>
   <L.button type="button" onClick={()=>download(`kumeel-lab-${stamp}.txt`,reportText(e),'text/plain;charset=utf-8')}>تصدير نصّي ↓</L.button>
   <L.button type="button" onClick={()=>download(`kumeel-lab-${stamp}.json`,JSON.stringify(e,null,2),'application/json')}>تصدير JSON ↓</L.button>
   <L.span role="status" className="lab-note">{copied}</L.span>
  </L.div>
 </L.article>
}
