import {L} from '../../lib/locale-ui'
import {useId,type Dispatch,type ReactNode} from 'react'
import {LIMITS,biases,claimSignals,criterionSignals,criticalityLabels,evidenceBalance,evidenceTypes,focusAssumption,kinds,levelLabels,objectionSignals,rankedAssumptions,consistencyNotes,type BiasKey,type ClaimKind,type Criticality,type EvidenceDirection,type EvidenceType,type Exercise,type LabAction,type Level,type Signal,type StepKey} from '../../lib/assumption-lab'

type Props={exercise:Exercise;step:StepKey;dispatch:Dispatch<LabAction>}

export function Signals({items}:{items:Signal[]}){if(!items.length)return null;return <L.ul className="lab-signals" aria-live="polite">{items.map(s=><L.li key={s.text} className={`is-${s.tone}`}>{s.text}</L.li>)}</L.ul>}

function Text({label,hint,value,onChange,rows=4,placeholder}:{label:string;hint?:string;value:string;onChange:(v:string)=>void;rows?:number;placeholder?:string}){
 const id=useId()
 return <L.label className="lab-field"><L.span>{label}</L.span><L.textarea rows={rows} maxLength={LIMITS.text} value={value} placeholder={placeholder} aria-describedby={hint?`${id}-hint`:undefined} onChange={e=>onChange(e.target.value)}/>{hint&&<L.small id={`${id}-hint`}>{hint}</L.small>}<L.span className="lab-count" aria-hidden="true">{value.length.toLocaleString('ar-SA')} / {LIMITS.text.toLocaleString('ar-SA')}</L.span></L.label>
}

function Choice<T extends string>({label,value,options,onChange}:{label:string;value:T;options:Record<T,string>;onChange:(v:T)=>void}){
 return <L.label className="lab-select"><L.span>{label}</L.span><L.select value={value} onChange={e=>onChange(e.target.value as T)}>{(Object.keys(options) as T[]).map(k=><L.option key={k} value={k}>{options[k]}</L.option>)}</L.select></L.label>
}

function Confidence({label,value,onChange}:{label:string;value:number;onChange:(v:number)=>void}){
 return <L.label className="lab-range"><L.span>{label}: <L.output>{value.toLocaleString('ar-SA')}٪</L.output></L.span><L.input type="range" min={0} max={100} step={5} value={value} onChange={e=>onChange(Number(e.target.value))}/><L.span className="lab-range-scale" aria-hidden="true"><L.i>أشكّ</L.i><L.i>متردد</L.i><L.i>واثق</L.i></L.span></L.label>
}

const typeOptions=Object.fromEntries(Object.entries(evidenceTypes).map(([k,v])=>[k,v.label])) as Record<EvidenceType,string>

export function LabStep({exercise:e,step,dispatch}:Props){
 const set=(patch:Extract<LabAction,{type:'set'}>['patch'])=>dispatch({type:'set',patch})
 const kind=kinds[e.kind]
 const content:Record<StepKey,()=>ReactNode>={
  claim:()=><>
   <Text label="ما الادعاء الذي تريد اختباره؟" hint="عبارة واحدة يمكن أن تكون صحيحة أو خاطئة. الادعاء غير السؤال." value={e.claim} onChange={v=>set({claim:v})} placeholder="مثال: القراءة اليومية تحسّن التركيز لدى أغلب البالغين."/>
   <Signals items={claimSignals(e.claim)}/>
   <Text label="النطاق (اختياري)" hint="على من، وأين، ومتى ينطبق؟ تحديد النطاق يمنع التعميم." rows={2} value={e.scope} onChange={v=>set({scope:v})}/>
  </>,
  kind:()=><>
   <L.fieldset className="lab-kinds"><L.legend>ما نوع هذا الادعاء؟</L.legend>{(Object.keys(kinds) as ClaimKind[]).map(k=><L.label key={k} className="lab-kind" data-selected={e.kind===k||undefined}><L.input type="radio" name="lab-kind" checked={e.kind===k} onChange={()=>set({kind:k})}/><L.strong>{kinds[k].label}</L.strong></L.label>)}</L.fieldset>
   <L.p className="lab-prompt">{kind.prompt}</L.p>
   {!e.kindReviewed&&<L.button type="button" className="lab-ghost" onClick={()=>set({kindReviewed:true})}>النوع الحالي صحيح</L.button>}
   <Confidence label="درجة اقتناعك قبل الفحص" value={e.before} onChange={v=>set({before:v})}/>
  </>,
  assumptions:()=>{
   const ranked=rankedAssumptions(e.assumptions)
   const focus=focusAssumption(e)
   return <>
    <L.p className="lab-prompt">ما الذي يجب أن يكون صحيحًا حتى يصحّ ادعاؤك؟ لكل افتراض: كم أنت واثق منه، وماذا يحدث للادعاء لو سقط؟</L.p>
    <L.ol className="lab-items">{e.assumptions.map((a,i)=><L.li key={a.id} className="lab-item" data-focus={focus?.id===a.id||undefined}>
     <Text label={`الافتراض ${(i+1).toLocaleString('ar-SA')}`} rows={2} value={a.text} onChange={v=>dispatch({type:'updateAssumption',id:a.id,patch:{text:v}})}/>
     <L.div className="lab-item-meta">
      <Choice<Level> label="ثقتك به" value={a.confidence} options={levelLabels} onChange={v=>dispatch({type:'updateAssumption',id:a.id,patch:{confidence:v}})}/>
      <Choice<Criticality> label="إن كان خاطئًا" value={a.criticality} options={criticalityLabels} onChange={v=>dispatch({type:'updateAssumption',id:a.id,patch:{criticality:v}})}/>
      <L.button type="button" className="lab-ghost" onClick={()=>dispatch({type:'removeAssumption',id:a.id})} aria-label={`حذف الافتراض ${i+1}`}>حذف</L.button>
     </L.div>
    </L.li>)}</L.ol>
    {e.assumptions.length<LIMITS.assumptions&&<L.button type="button" className="lab-add" onClick={()=>dispatch({type:'addAssumption'})}>+ أضف افتراضًا</L.button>}
    {ranked.length>0&&<L.div className="lab-risk"><L.h4>ترتيب الخطورة</L.h4><L.p className="lab-note">الخطورة = اعتماد الادعاء على الافتراض × قلة ثقتك به. اختبر الأخطر أولًا.</L.p><L.ol>{ranked.map(a=><L.li key={a.id}><L.span className="lab-meter"><L.i style={{inlineSize:`${Math.round(a.risk*100)}%`}}/></L.span><L.span className="lab-risk-text">{a.text}</L.span><L.label className="lab-focus"><L.input type="radio" name="lab-focus" checked={focus?.id===a.id} onChange={()=>set({focusId:a.id})}/>محوري</L.label></L.li>)}</L.ol></L.div>}
   </>
  },
  objection:()=><>
   {e.source?.counterpoint&&<L.details className="lab-source"><L.summary>اعتراض الفكرة الأصلي</L.summary><L.p className="preserve-lines">{e.source.counterpoint}</L.p></L.details>}
   <Text label="ما أقوى اعتراض منصف على ادعائك؟" hint={`أنت تختبر «${e.claim.slice(0,100)}». اكتب الاعتراض كما يكتبه أفضل مدافع عنه.`} rows={5} value={e.objection} onChange={v=>set({objection:v})}/>
   <Signals items={objectionSignals(e.objection)}/>
   <L.label className="lab-check"><L.input type="checkbox" checked={e.objectionFair} onChange={ev=>set({objectionFair:ev.target.checked})}/>لو قرأ صاحب الاعتراض هذه الصياغة لقبلها تمثيلًا لرأيه.</L.label>
  </>,
  evidence:()=>{
   const balance=evidenceBalance(e.evidence)
   const total=balance.support+balance.oppose
   const focus=focusAssumption(e)
   const column=(direction:EvidenceDirection,title:string)=>{const items=e.evidence.filter(x=>x.direction===direction);return <L.section className={`lab-evidence is-${direction}`} aria-label={title}><L.h4>{title} <L.span>({items.length.toLocaleString('ar-SA')})</L.span></L.h4>
    {items.map(x=><L.div key={x.id} className="lab-item">
     <Text label="الدليل" rows={2} value={x.text} onChange={v=>dispatch({type:'updateEvidence',id:x.id,patch:{text:v}})}/>
     <L.div className="lab-item-meta">
      <Choice<EvidenceType> label="نوعه" value={x.type} options={typeOptions} onChange={v=>dispatch({type:'updateEvidence',id:x.id,patch:{type:v}})}/>
      <Choice<Level> label="موثوقيته" value={x.strength} options={levelLabels} onChange={v=>dispatch({type:'updateEvidence',id:x.id,patch:{strength:v}})}/>
      <L.button type="button" className="lab-ghost" onClick={()=>dispatch({type:'removeEvidence',id:x.id})}>حذف</L.button>
     </L.div>
     {focus&&<L.label className="lab-check is-small"><L.input type="checkbox" checked={x.testsFocus} onChange={ev=>dispatch({type:'updateEvidence',id:x.id,patch:{testsFocus:ev.target.checked}})}/>يختبر الافتراض المحوري</L.label>}
    </L.div>)}
    {e.evidence.length<LIMITS.evidence&&<L.button type="button" className="lab-add" onClick={()=>dispatch({type:'addEvidence',direction})}>+ {direction==='for'?'دليل مؤيد':'دليل معارض'}</L.button>}
   </L.section>}
   return <>
    <L.p className="lab-prompt"><L.strong>{kind.evidenceLabel}:</L.strong> {kind.evidenceHint}</L.p>
    {focus&&<L.p className="lab-note">الافتراض المحوري: «{focus.text}»</L.p>}
    <L.div className="lab-balance" role="img" aria-label={`ميزان الأدلة: ${balance.label}`}><L.div className="lab-balance-bar"><L.i className="is-for" style={{inlineSize:total?`${balance.support/total*100}%`:'50%'}}/><L.i className="is-against" style={{inlineSize:total?`${balance.oppose/total*100}%`:'50%'}}/></L.div><L.span>{balance.label}</L.span></L.div>
    <L.p className="lab-note">الوزن تقريبي: البيانات أثقل من الحجة، والحجة أثقل من التجربة الشخصية، وتضاعفه الموثوقية. الميزان أداة تأمل لا حكم.</L.p>
    <L.div className="lab-evidence-grid">{column('for','يؤيد الادعاء')}{column('against','يعارض الادعاء')}</L.div>
    {!e.evidence.some(x=>x.direction==='against'&&x.text.trim())&&<L.label className="lab-check"><L.input type="checkbox" checked={e.noCounterEvidence} onChange={ev=>set({noCounterEvidence:ev.target.checked})}/>بحثت عن دليل معارض ولم أجد.</L.label>}
    {e.noCounterEvidence&&<Signals items={[{tone:'tip',text:'غياب الدليل المعارض قد يعني أن البحث لم يكتمل. أين يمكن أن يوجد لو كان موجودًا؟'}]}/>}
    <Text label="ملاحظات على الأدلة (اختياري)" rows={2} value={e.evidenceNotes} onChange={v=>set({evidenceNotes:v})}/>
   </>
  },
  criterion:()=><>
   <Text label="متى ستراجع موقفك؟" hint="أكمل: إذا ظهر… فسأراجع… المراجعة الجزئية مراجعة أيضًا." rows={3} value={e.criterion} onChange={v=>set({criterion:v})} placeholder="إذا ظهرت دراسة على عيّنة كبيرة لا تجد فرقًا… فسأخفّض ثقتي."/>
   <Signals items={criterionSignals(e.criterion)}/>
  </>,
  biases:()=><>
   <L.p className="lab-prompt">لا أحد بلا تحيّز. اختر ما قد يكون أثّر في تقديرك؛ الاعتراف به جزء من الفحص لا علامة ضعف.</L.p>
   <L.div className="lab-biases">{(Object.keys(biases) as BiasKey[]).map(b=><L.label key={b} className="lab-bias" data-selected={e.biases.includes(b)||undefined}><L.input type="checkbox" checked={e.biases.includes(b)} onChange={()=>dispatch({type:'toggleBias',bias:b})}/><L.strong>{biases[b].label}</L.strong><L.small>{biases[b].question}</L.small></L.label>)}</L.div>
   <Text label="تأمل قصير" hint="كيف قد يغيّر هذا التحيّز قراءتك للأدلة؟ أو لماذا لا ترى أيًّا منها هنا؟" rows={3} value={e.biasReflection} onChange={v=>set({biasReflection:v})}/>
  </>,
  conclusion:()=><>
   <Text label="ما موقفك الآن، ولماذا؟" hint="اذكر ما تغيّر وما بقي مفتوحًا. بقاء الموقف ممكن إذا شرحت ما ثبّته." rows={5} value={e.conclusion} onChange={v=>set({conclusion:v})}/>
   <Confidence label="درجة اقتناعك بعد الفحص" value={e.after} onChange={v=>set({after:v})}/>
   <L.p className="lab-delta">التغيّر: <L.strong>{e.after-e.before>0?'+':''}{(e.after-e.before).toLocaleString('ar-SA')}</L.strong> نقطة <L.small>— وصف شخصي، لا تقييم لجودة تفكيرك.</L.small></L.p>
   <L.div className="lab-consistency"><L.h4>فحص الاتساق</L.h4><Signals items={consistencyNotes(e)}/></L.div>
  </>,
 }
 return <>{content[step]()}</>
}
