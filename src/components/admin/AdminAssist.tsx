import {useState,type ReactNode} from 'react'
import type {Content} from '../../content'
import type {QuizQuestion} from '../../learning'
import {ASSIST_MAX_TEXT,describableImage,paragraphDiff,requestAssist} from '../../lib/ai-assist'

type Props={content:Content;save:(next:Content)=>boolean}
type Mode='proofread'|'alt'|'summary'|'quiz'
const modes:[Mode,string,string][]=[['proofread','التدقيق اللغوي','إملاء ونحو وترقيم دون تغيير الأسلوب'],['alt','وصف الصور','نص بديل لقرّاء الشاشة'],['summary','ملخص اللقاءات','من ملاحظاتك إلى أرشيف منظّم'],['quiz','أسئلة الفهم','مسودات أسئلة من مقال']]
const n=(v:number)=>v.toLocaleString('ar-SA')

// One request at a time per panel, with a uniform error surface.
function useAssist(){
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 async function run<T>(task:()=>Promise<T>):Promise<T|null>{setBusy(true);setError('');try{return await task()}catch(e){setError(e instanceof Error?e.message:'تعذّر تنفيذ الطلب.');return null}finally{setBusy(false)}}
 return {busy,error,run,setError}
}
function Status({busy,error,children}:{busy:boolean;error:string;children?:ReactNode}){return <p className={`assist-status${error?' is-error':''}`} role="status">{busy?'جارٍ التواصل مع المساعد…':error||children}</p>}

function Proofread({content,save}:Props){
 const {busy,error,run}=useAssist()
 const [id,setId]=useState(content.writings[0]?.id??'')
 const [result,setResult]=useState<{id:string;corrected:string;notes:string[]}|null>(null)
 const writing=content.writings.find(w=>w.id===id)
 const tooLong=Boolean(writing&&writing.text.length>ASSIST_MAX_TEXT)
 const diff=result&&writing&&result.id===writing.id?paragraphDiff(writing.text,result.corrected):[]
 const changed=diff.filter(d=>d.changed).length
 return <section className="admin-card">
  <label className="admin-field"><span className="admin-field-label">النص</span><select value={id} onChange={e=>{setId(e.target.value);setResult(null)}}>{content.writings.map(w=><option key={w.id} value={w.id}>{w.title}</option>)}</select>{writing&&<small>{n(writing.text.length)} حرف{tooLong&&` — أطول من حد المساعد (${n(ASSIST_MAX_TEXT)} حرف). قسّمه أو دقّقه يدويًا.`}</small>}</label>
  <button className="admin-btn is-primary" disabled={!writing||busy||tooLong} onClick={async()=>{if(!writing)return;const data=await run(()=>requestAssist('proofread',{text:writing.text}));if(data)setResult({id:writing.id,...data})}}>دقّق النص</button>
  <Status busy={busy} error={error}/>
  {result&&writing&&result.id===writing.id&&<div className="assist-result">
   <div className="admin-card-head"><h3>{changed?`${n(changed)} فقرات تغيّرت`:'لا تغييرات مقترحة'}</h3>{changed>0&&<div className="assist-actions"><button className="admin-btn" onClick={()=>setResult(null)}>تجاهل</button><button className="admin-btn is-primary" onClick={()=>{if(save({...content,writings:content.writings.map(w=>w.id===writing.id?{...w,text:result.corrected}:w)}))setResult(null)}}>اعتماد التصحيح</button></div>}</div>
   {result.notes.length>0&&<ul className="assist-notes">{result.notes.map((note,i)=><li key={i}>{note}</li>)}</ul>}
   <div className="assist-diff">{diff.filter(d=>d.changed).map((d,i)=><div key={i} className="assist-diff-row"><p className="is-before">{d.before||'—'}</p><p className="is-after">{d.after||'—'}</p></div>)}</div>
  </div>}
 </section>
}

function AltText({content,save}:Props){
 const {busy,error,run}=useAssist()
 const [drafts,setDrafts]=useState<Record<string,string>>({})
 const [working,setWorking]=useState('')
 const images=content.media.filter(m=>m.type==='صورة')
 const missing=images.filter(m=>!m.description?.trim()).length
 if(!images.length)return <p className="admin-empty">لا توجد صور في المكتبة بعد.</p>
 return <section className="admin-card">
  <p className="admin-muted">{missing?`${n(missing)} من ${n(images.length)} صور بلا وصف.`:'كل الصور موصوفة. يمكنك تحسين أي وصف.'} يقرأ المساعد الصور المرفوعة إلى مكتبة المنصة فقط.</p>
  <ul className="assist-images">{images.map(m=>{const draft=drafts[m.id];const allowed=describableImage(m.url);return <li key={m.id}>
   <img src={m.thumbnail??m.url} alt="" loading="lazy"/>
   <div>
    <strong>{m.title}</strong>
    {draft===undefined?<p className={m.description?.trim()?'':'admin-muted'}>{m.description?.trim()||'بلا وصف'}</p>:<textarea rows={3} maxLength={300} value={draft} onChange={e=>setDrafts({...drafts,[m.id]:e.target.value})} aria-label={`الوصف المقترح لـ ${m.title}`}/>}
    <div className="assist-actions">
     {draft===undefined?<button className="admin-btn" disabled={busy||!allowed} title={allowed?undefined:'الصورة خارج مكتبة المنصة'} onClick={async()=>{setWorking(m.id);const data=await run(()=>requestAssist('alt',{imageUrl:m.url,title:m.title,context:m.purpose??''}));setWorking('');if(data)setDrafts(d=>({...d,[m.id]:data.alt}))}}>{working===m.id?'جارٍ الوصف…':'اقترح وصفًا'}</button>
     :<><button className="admin-btn" onClick={()=>{const {[m.id]:_,...rest}=drafts;void _;setDrafts(rest)}}>إلغاء</button><button className="admin-btn is-primary" disabled={!draft.trim()} onClick={()=>{if(save({...content,media:content.media.map(x=>x.id===m.id?{...x,description:draft.trim()}:x)})){const {[m.id]:_,...rest}=drafts;void _;setDrafts(rest)}}}>حفظ الوصف</button></>}
     {!allowed&&<small className="admin-muted">خارج مكتبة المنصة</small>}
    </div>
   </div>
  </li>})}</ul>
  <Status busy={busy} error={error}/>
 </section>
}

function SessionSummary({content,save}:Props){
 const {busy,error,run}=useAssist()
 const sessions=[...(content.sessions??[])].sort((a,b)=>Date.parse(b.startsAt)-Date.parse(a.startsAt))
 const [id,setId]=useState(sessions.find(s=>!s.summary?.trim())?.id??sessions[0]?.id??'')
 const session=sessions.find(s=>s.id===id)
 const [notes,setNotes]=useState(session?.notes??'')
 const [draft,setDraft]=useState<string|null>(null)
 if(!sessions.length)return <p className="admin-empty">لا توجد لقاءات بعد.</p>
 return <section className="admin-card">
  <label className="admin-field"><span className="admin-field-label">اللقاء</span><select value={id} onChange={e=>{const next=sessions.find(s=>s.id===e.target.value);setId(e.target.value);setNotes(next?.notes??'');setDraft(null)}}>{sessions.map(s=><option key={s.id} value={s.id}>{s.title}{s.summary?.trim()?' ✓':''}</option>)}</select>{session?.summary?.trim()&&<small>لهذا اللقاء ملخص محفوظ؛ الحفظ سيستبدله.</small>}</label>
  <label className="admin-field"><span className="admin-field-label">ملاحظاتك من اللقاء</span><textarea rows={8} maxLength={ASSIST_MAX_TEXT} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="النقاط كما دوّنتها: الأسئلة، الآراء، الحجج، ما لم يُحسم…"/><small>{n(notes.length)} / {n(ASSIST_MAX_TEXT)} — تُرسل الملاحظات إلى Gemini لتلخيصها.</small></label>
  <button className="admin-btn is-primary" disabled={!session||busy||notes.trim().length<20} onClick={async()=>{if(!session)return;const data=await run(()=>requestAssist('sessionSummary',{notes,title:session.title,question:session.question}));if(data)setDraft(data.summary)}}>لخّص الملاحظات</button>
  <Status busy={busy} error={error}>{notes.trim().length<20?'اكتب عشرين حرفًا على الأقل من الملاحظات.':''}</Status>
  {draft!==null&&session&&<div className="assist-result"><label className="admin-field"><span className="admin-field-label">الملخص المقترح — عدّله كما تشاء</span><textarea rows={12} maxLength={10000} value={draft} onChange={e=>setDraft(e.target.value)}/></label><div className="assist-actions"><button className="admin-btn" onClick={()=>setDraft(null)}>تجاهل</button><button className="admin-btn is-primary" disabled={!draft.trim()} onClick={()=>{if(save({...content,sessions:(content.sessions??[]).map(s=>s.id===session.id?{...s,summary:draft.trim()}:s)}))setDraft(null)}}>حفظ في أرشيف اللقاء</button></div></div>}
 </section>
}

function QuizDrafts({content,save}:Props){
 const {busy,error,run}=useAssist()
 const sources=[...(content.discoveries??[]).map(d=>({key:`d:${d.id}`,title:d.title,text:`${d.intro}\n\n${d.text}`,group:'مقالات الاكتشاف'})),...content.writings.map(w=>({key:`w:${w.id}`,title:w.title,text:w.text,group:'الكتابات'}))]
 const [key,setKey]=useState(sources[0]?.key??'')
 const [count,setCount]=useState(3)
 const [drafts,setDrafts]=useState<(QuizQuestion&{keep:boolean})[]>([])
 const source=sources.find(s=>s.key===key)
 const room=100-(content.quiz?.length??0)
 const kept=drafts.filter(d=>d.keep)
 if(!sources.length)return <p className="admin-empty">أضف مقالًا أو كتابة أولًا.</p>
 return <section className="admin-card">
  <div className="admin-field-grid">
   <label className="admin-field"><span className="admin-field-label">المصدر</span><select value={key} onChange={e=>{setKey(e.target.value);setDrafts([])}}>{['مقالات الاكتشاف','الكتابات'].map(g=><optgroup key={g} label={g}>{sources.filter(s=>s.group===g).map(s=><option key={s.key} value={s.key}>{s.title}</option>)}</optgroup>)}</select></label>
   <label className="admin-field"><span className="admin-field-label">عدد الأسئلة</span><select value={count} onChange={e=>setCount(Number(e.target.value))}>{[1,2,3,4,5].map(c=><option key={c} value={c}>{n(c)}</option>)}</select></label>
  </div>
  <button className="admin-btn is-primary" disabled={!source||busy||source.text.length<50||room<1} onClick={async()=>{if(!source)return;const data=await run(()=>requestAssist('quiz',{text:source.text.slice(0,ASSIST_MAX_TEXT),title:source.title,count}));if(data)setDrafts(data.questions.map(q=>({...q,keep:true})))}}>اقترح أسئلة</button>
  <Status busy={busy} error={error}>{room<1?'بلغت أسئلة التحدي الحد الأقصى (١٠٠).':''}</Status>
  {drafts.length>0&&<div className="assist-result">
   <ol className="assist-quiz">{drafts.map((q,i)=><li key={i} data-off={!q.keep||undefined}>
    <label className="admin-switch"><input type="checkbox" checked={q.keep} onChange={e=>setDrafts(drafts.map((d,j)=>j===i?{...d,keep:e.target.checked}:d))}/><span>{q.keep?'سيُضاف':'مستبعد'}</span></label>
    <strong>{q.title}</strong>
    <ul>{q.options.map((o,j)=><li key={j} className={j===q.answer?'is-answer':''}>{o}</li>)}</ul>
    <small>{q.why}</small>
   </li>)}</ol>
   <div className="assist-actions"><button className="admin-btn" onClick={()=>setDrafts([])}>تجاهل الكل</button><button className="admin-btn is-primary" disabled={!kept.length||kept.length>room} onClick={()=>{if(save({...content,quiz:[...(content.quiz??[]),...kept.map(({keep:_,...q})=>{void _;return q})]}))setDrafts([])}}>أضف {n(kept.length)} إلى أسئلة التحدي</button></div>
   <p className="admin-muted">يمكنك تعديل الأسئلة بعد الإضافة من «المحتوى التعليمي».</p>
  </div>}
 </section>
}

export function AdminAssist({content,save}:Props){
 const [mode,setMode]=useState<Mode>('proofread')
 const panels:Record<Mode,ReactNode>={proofread:<Proofread content={content} save={save}/>,alt:<AltText content={content} save={save}/>,summary:<SessionSummary content={content} save={save}/>,quiz:<QuizDrafts content={content} save={save}/>}
 return <div className="admin-assist">
  <p className="assist-disclosure"><strong>اقتراحات آلية من Gemini.</strong> لا يُحفظ شيء قبل أن تراجعه وتعتمده. النص أو الصورة المختارة تُرسل إلى Google لمعالجة الطلب، فلا ترسل ما لا تريد مشاركته.</p>
  <div className="assist-modes" role="tablist" aria-label="مهام المساعد">{modes.map(([key,label,hint])=><button key={key} role="tab" aria-selected={mode===key} onClick={()=>setMode(key)}><strong>{label}</strong><small>{hint}</small></button>)}</div>
  <div role="tabpanel">{panels[mode]}</div>
 </div>
}
