import {useId,type Dispatch,type ReactNode} from 'react'
import {LIMITS,biases,claimSignals,criterionSignals,criticalityLabels,evidenceBalance,evidenceTypes,focusAssumption,kinds,levelLabels,objectionSignals,rankedAssumptions,consistencyNotes,type BiasKey,type ClaimKind,type Criticality,type EvidenceDirection,type EvidenceType,type Exercise,type LabAction,type Level,type Signal,type StepKey} from '../../lib/assumption-lab'

type Props={exercise:Exercise;step:StepKey;dispatch:Dispatch<LabAction>}

export function Signals({items}:{items:Signal[]}){if(!items.length)return null;return <ul className="lab-signals" aria-live="polite">{items.map(s=><li key={s.text} className={`is-${s.tone}`}>{s.text}</li>)}</ul>}

function Text({label,hint,value,onChange,rows=4,placeholder}:{label:string;hint?:string;value:string;onChange:(v:string)=>void;rows?:number;placeholder?:string}){
 const id=useId()
 return <label className="lab-field"><span>{label}</span><textarea rows={rows} maxLength={LIMITS.text} value={value} placeholder={placeholder} aria-describedby={hint?`${id}-hint`:undefined} onChange={e=>onChange(e.target.value)}/>{hint&&<small id={`${id}-hint`}>{hint}</small>}<span className="lab-count" aria-hidden="true">{value.length.toLocaleString('ar-SA')} / {LIMITS.text.toLocaleString('ar-SA')}</span></label>
}

function Choice<T extends string>({label,value,options,onChange}:{label:string;value:T;options:Record<T,string>;onChange:(v:T)=>void}){
 return <label className="lab-select"><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value as T)}>{(Object.keys(options) as T[]).map(k=><option key={k} value={k}>{options[k]}</option>)}</select></label>
}

function Confidence({label,value,onChange}:{label:string;value:number;onChange:(v:number)=>void}){
 return <label className="lab-range"><span>{label}: <output>{value.toLocaleString('ar-SA')}٪</output></span><input type="range" min={0} max={100} step={5} value={value} onChange={e=>onChange(Number(e.target.value))}/><span className="lab-range-scale" aria-hidden="true"><i>أشكّ</i><i>متردد</i><i>واثق</i></span></label>
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
   <fieldset className="lab-kinds"><legend>ما نوع هذا الادعاء؟</legend>{(Object.keys(kinds) as ClaimKind[]).map(k=><label key={k} className="lab-kind" data-selected={e.kind===k||undefined}><input type="radio" name="lab-kind" checked={e.kind===k} onChange={()=>set({kind:k})}/><strong>{kinds[k].label}</strong></label>)}</fieldset>
   <p className="lab-prompt">{kind.prompt}</p>
   {!e.kindReviewed&&<button type="button" className="lab-ghost" onClick={()=>set({kindReviewed:true})}>النوع الحالي صحيح</button>}
   <Confidence label="درجة اقتناعك قبل الفحص" value={e.before} onChange={v=>set({before:v})}/>
  </>,
  assumptions:()=>{
   const ranked=rankedAssumptions(e.assumptions)
   const focus=focusAssumption(e)
   return <>
    <p className="lab-prompt">ما الذي يجب أن يكون صحيحًا حتى يصحّ ادعاؤك؟ لكل افتراض: كم أنت واثق منه، وماذا يحدث للادعاء لو سقط؟</p>
    <ol className="lab-items">{e.assumptions.map((a,i)=><li key={a.id} className="lab-item" data-focus={focus?.id===a.id||undefined}>
     <Text label={`الافتراض ${(i+1).toLocaleString('ar-SA')}`} rows={2} value={a.text} onChange={v=>dispatch({type:'updateAssumption',id:a.id,patch:{text:v}})}/>
     <div className="lab-item-meta">
      <Choice<Level> label="ثقتك به" value={a.confidence} options={levelLabels} onChange={v=>dispatch({type:'updateAssumption',id:a.id,patch:{confidence:v}})}/>
      <Choice<Criticality> label="إن كان خاطئًا" value={a.criticality} options={criticalityLabels} onChange={v=>dispatch({type:'updateAssumption',id:a.id,patch:{criticality:v}})}/>
      <button type="button" className="lab-ghost" onClick={()=>dispatch({type:'removeAssumption',id:a.id})} aria-label={`حذف الافتراض ${i+1}`}>حذف</button>
     </div>
    </li>)}</ol>
    {e.assumptions.length<LIMITS.assumptions&&<button type="button" className="lab-add" onClick={()=>dispatch({type:'addAssumption'})}>+ أضف افتراضًا</button>}
    {ranked.length>0&&<div className="lab-risk"><h4>ترتيب الخطورة</h4><p className="lab-note">الخطورة = اعتماد الادعاء على الافتراض × قلة ثقتك به. اختبر الأخطر أولًا.</p><ol>{ranked.map(a=><li key={a.id}><span className="lab-meter"><i style={{inlineSize:`${Math.round(a.risk*100)}%`}}/></span><span className="lab-risk-text">{a.text}</span><label className="lab-focus"><input type="radio" name="lab-focus" checked={focus?.id===a.id} onChange={()=>set({focusId:a.id})}/>محوري</label></li>)}</ol></div>}
   </>
  },
  objection:()=><>
   {e.source?.counterpoint&&<details className="lab-source"><summary>اعتراض الفكرة الأصلي</summary><p className="preserve-lines">{e.source.counterpoint}</p></details>}
   <Text label="ما أقوى اعتراض منصف على ادعائك؟" hint={`أنت تختبر «${e.claim.slice(0,100)}». اكتب الاعتراض كما يكتبه أفضل مدافع عنه.`} rows={5} value={e.objection} onChange={v=>set({objection:v})}/>
   <Signals items={objectionSignals(e.objection)}/>
   <label className="lab-check"><input type="checkbox" checked={e.objectionFair} onChange={ev=>set({objectionFair:ev.target.checked})}/>لو قرأ صاحب الاعتراض هذه الصياغة لقبلها تمثيلًا لرأيه.</label>
  </>,
  evidence:()=>{
   const balance=evidenceBalance(e.evidence)
   const total=balance.support+balance.oppose
   const focus=focusAssumption(e)
   const column=(direction:EvidenceDirection,title:string)=>{const items=e.evidence.filter(x=>x.direction===direction);return <section className={`lab-evidence is-${direction}`} aria-label={title}><h4>{title} <span>({items.length.toLocaleString('ar-SA')})</span></h4>
    {items.map(x=><div key={x.id} className="lab-item">
     <Text label="الدليل" rows={2} value={x.text} onChange={v=>dispatch({type:'updateEvidence',id:x.id,patch:{text:v}})}/>
     <div className="lab-item-meta">
      <Choice<EvidenceType> label="نوعه" value={x.type} options={typeOptions} onChange={v=>dispatch({type:'updateEvidence',id:x.id,patch:{type:v}})}/>
      <Choice<Level> label="موثوقيته" value={x.strength} options={levelLabels} onChange={v=>dispatch({type:'updateEvidence',id:x.id,patch:{strength:v}})}/>
      <button type="button" className="lab-ghost" onClick={()=>dispatch({type:'removeEvidence',id:x.id})}>حذف</button>
     </div>
     {focus&&<label className="lab-check is-small"><input type="checkbox" checked={x.testsFocus} onChange={ev=>dispatch({type:'updateEvidence',id:x.id,patch:{testsFocus:ev.target.checked}})}/>يختبر الافتراض المحوري</label>}
    </div>)}
    {e.evidence.length<LIMITS.evidence&&<button type="button" className="lab-add" onClick={()=>dispatch({type:'addEvidence',direction})}>+ {direction==='for'?'دليل مؤيد':'دليل معارض'}</button>}
   </section>}
   return <>
    <p className="lab-prompt"><strong>{kind.evidenceLabel}:</strong> {kind.evidenceHint}</p>
    {focus&&<p className="lab-note">الافتراض المحوري: «{focus.text}»</p>}
    <div className="lab-balance" role="img" aria-label={`ميزان الأدلة: ${balance.label}`}><div className="lab-balance-bar"><i className="is-for" style={{inlineSize:total?`${balance.support/total*100}%`:'50%'}}/><i className="is-against" style={{inlineSize:total?`${balance.oppose/total*100}%`:'50%'}}/></div><span>{balance.label}</span></div>
    <p className="lab-note">الوزن تقريبي: البيانات أثقل من الحجة، والحجة أثقل من التجربة الشخصية، وتضاعفه الموثوقية. الميزان أداة تأمل لا حكم.</p>
    <div className="lab-evidence-grid">{column('for','يؤيد الادعاء')}{column('against','يعارض الادعاء')}</div>
    {!e.evidence.some(x=>x.direction==='against'&&x.text.trim())&&<label className="lab-check"><input type="checkbox" checked={e.noCounterEvidence} onChange={ev=>set({noCounterEvidence:ev.target.checked})}/>بحثت عن دليل معارض ولم أجد.</label>}
    {e.noCounterEvidence&&<Signals items={[{tone:'tip',text:'غياب الدليل المعارض قد يعني أن البحث لم يكتمل. أين يمكن أن يوجد لو كان موجودًا؟'}]}/>}
    <Text label="ملاحظات على الأدلة (اختياري)" rows={2} value={e.evidenceNotes} onChange={v=>set({evidenceNotes:v})}/>
   </>
  },
  criterion:()=><>
   <Text label="متى ستراجع موقفك؟" hint="أكمل: إذا ظهر… فسأراجع… المراجعة الجزئية مراجعة أيضًا." rows={3} value={e.criterion} onChange={v=>set({criterion:v})} placeholder="إذا ظهرت دراسة على عيّنة كبيرة لا تجد فرقًا… فسأخفّض ثقتي."/>
   <Signals items={criterionSignals(e.criterion)}/>
  </>,
  biases:()=><>
   <p className="lab-prompt">لا أحد بلا تحيّز. اختر ما قد يكون أثّر في تقديرك؛ الاعتراف به جزء من الفحص لا علامة ضعف.</p>
   <div className="lab-biases">{(Object.keys(biases) as BiasKey[]).map(b=><label key={b} className="lab-bias" data-selected={e.biases.includes(b)||undefined}><input type="checkbox" checked={e.biases.includes(b)} onChange={()=>dispatch({type:'toggleBias',bias:b})}/><strong>{biases[b].label}</strong><small>{biases[b].question}</small></label>)}</div>
   <Text label="تأمل قصير" hint="كيف قد يغيّر هذا التحيّز قراءتك للأدلة؟ أو لماذا لا ترى أيًّا منها هنا؟" rows={3} value={e.biasReflection} onChange={v=>set({biasReflection:v})}/>
  </>,
  conclusion:()=><>
   <Text label="ما موقفك الآن، ولماذا؟" hint="اذكر ما تغيّر وما بقي مفتوحًا. بقاء الموقف ممكن إذا شرحت ما ثبّته." rows={5} value={e.conclusion} onChange={v=>set({conclusion:v})}/>
   <Confidence label="درجة اقتناعك بعد الفحص" value={e.after} onChange={v=>set({after:v})}/>
   <p className="lab-delta">التغيّر: <strong>{e.after-e.before>0?'+':''}{(e.after-e.before).toLocaleString('ar-SA')}</strong> نقطة <small>— وصف شخصي، لا تقييم لجودة تفكيرك.</small></p>
   <div className="lab-consistency"><h4>فحص الاتساق</h4><Signals items={consistencyNotes(e)}/></div>
  </>,
 }
 return <>{content[step]()}</>
}
