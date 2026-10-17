import {useEffect,useRef,useState} from 'react'
import {translationSources,savePrivateTranslation,acceptGeneratedTranslation,approvePrivateTranslation,withdrawTranslation,discardPrivateTranslation,translationStatus,type OwnerDraft as Content,type TranslationKey,type TranslationSource} from '../../lib/translations'
import {sourceDigest} from '../../lib/source-hash.mjs'
import {ASSIST_MAX_TEXT,requestAssist} from '../../lib/ai-assist'

type Props={content:Content;save:(next:Content)=>boolean}
type Status=Awaited<ReturnType<typeof translationStatus>>
const n=(v:number)=>v.toLocaleString('ar-SA')

function StatusChips({status}:{status:Status|null}){
 if(!status)return null
 return <div className="admin-status">
  {status.approved==='none'&&<span className="admin-chip">غير معتمدة للنشر</span>}
  {status.approved==='current'&&<span className="admin-chip is-success">معتمدة — تظهر بعد النشر</span>}
  {status.approved==='stale'&&<span className="admin-chip is-danger">تغيّر الأصل — الترجمة المعتمدة محجوبة حتى تراجعها</span>}
  {status.pending&&status.draft!=='none'&&<span className="admin-chip is-warning">مسودة خاصة غير معتمدة{status.draft==='stale'?' (على أصل قديم)':''}</span>}
 </div>
}

// Keyed by source so switching writings never carries text or late results across.
function TranslationEditor({content,save,source}:Props&{source:TranslationSource}){
 const key=source.key
 const stored=content.translationDrafts?.[key]??content.translations?.[key]
 const [title,setTitle]=useState(stored?.title??'')
 const [text,setText]=useState(stored?.text??'')
 const [status,setStatus]=useState<Status|null>(null)
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState({text:'',error:false})
 const latest=useRef(content)
 const mounted=useRef(true)
 useEffect(()=>{latest.current=content},[content])
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[])
 useEffect(()=>{let active=true;void translationStatus(content,key).then(s=>{if(active)setStatus(s)});return()=>{active=false}},[content,key])
 const tooLong=source.text.length>ASSIST_MAX_TEXT
 const edited=title!==(stored?.title??'')||text!==(stored?.text??'')

 async function act(task:()=>Promise<string>){
  if(busy)return
  setBusy(true);setMessage({text:'',error:false})
  try{const done=await task();if(mounted.current)setMessage({text:done,error:false})}
  catch(e){if(mounted.current)setMessage({text:e instanceof Error?e.message:'تعذّر تنفيذ الطلب.',error:true})}
  finally{if(mounted.current)setBusy(false)}
 }
 const persist=(next:Content)=>{if(!save(next))throw new Error('لم يُحفظ التغيير. راجع حجم المسودة أو مساحة المتصفح.')}
 const generate=()=>act(async()=>{
  if(content.translationDrafts?.[key]&&!window.confirm('ستحلّ الترجمة المقترحة محل مسودتك الخاصة لهذا النص. هل تريد المتابعة؟'))return ''
  const requested=await sourceDigest(content,key)
  const data=await requestAssist('translate',{title:source.title,text:source.text,format:source.format,sourceLanguage:'ar',targetLanguage:'en'})
  if(!mounted.current)return ''
  const next=await acceptGeneratedTranslation(latest.current,key,requested,data)
  if(!next)throw new Error('تغيّر النص العربي أثناء الترجمة، فلم تُحفظ النتيجة. أعد الطلب.')
  persist(next);setTitle(data.title);setText(data.text)
  return 'حُفظت الترجمة المقترحة مسودةً خاصة. راجعها قبل اعتمادها.'
 })
 const savePrivate=()=>act(async()=>{persist(await savePrivateTranslation(latest.current,key,{title,text}));return 'حُفظت مسودة الترجمة الخاصة. لا يراها الزوار.'})
 const approve=()=>act(async()=>{
  const draft=edited||!latest.current.translationDrafts?.[key]?await savePrivateTranslation(latest.current,key,{title,text}):latest.current
  persist(await approvePrivateTranslation(draft,key))
  return 'اعتُمدت الترجمة. ستظهر للزوار بعد النشر من «النشر والحساب».'
 })
 const withdraw=()=>act(async()=>{
  if(!window.confirm('ستُحجب الترجمة الإنجليزية عن الزوار بعد النشر التالي، وتبقى مسودتك الخاصة. هل تريد المتابعة؟'))return ''
  persist(withdrawTranslation(latest.current,key));return 'سُحب الاعتماد. انشر لتطبيقه على الموقع.'
 })
 const discard=()=>act(async()=>{
  if(!window.confirm('ستُحذف مسودة الترجمة الخاصة لهذا النص. لن يتأثر المعتمد منها. هل تريد المتابعة؟'))return ''
  persist(discardPrivateTranslation(latest.current,key))
  const approved=latest.current.translations?.[key];setTitle(approved?.title??'');setText(approved?.text??'')
  return 'حُذفت المسودة الخاصة.'
 })

 return <div className="assist-result">
  <StatusChips status={status}/>
  <div className="translation-pair">
   <div className="translation-source" lang="ar" dir="rtl">
    <span className="admin-field-label">الأصل العربي</span>
    {source.title&&<h3>{source.title}</h3>}
    <p>{source.text}</p>
    <small className="admin-muted">{n(source.text.length)} حرف{tooLong&&` — أطول من حد المساعد (${n(ASSIST_MAX_TEXT)} حرف). يمكنك الترجمة يدويًا.`}</small>
   </div>
   <div className="translation-target">
    {key!=='bio'&&<label className="admin-field"><span className="admin-field-label">English title</span><input lang="en" dir="ltr" maxLength={300} value={title} onChange={e=>setTitle(e.target.value)}/></label>}
    <label className="admin-field"><span className="admin-field-label">English translation</span><textarea lang="en" dir="ltr" rows={14} maxLength={60000} value={text} onChange={e=>setText(e.target.value)}/><small>{edited?'تعديلات غير محفوظة':'محفوظ'} · {n(text.length)} / {n(60000)}</small></label>
   </div>
  </div>
  <div className="assist-actions">
   <button className="admin-btn" disabled={busy||tooLong} onClick={()=>void generate()}>اقترح ترجمة آلية</button>
   <button className="admin-btn" disabled={busy||!edited} onClick={()=>void savePrivate()}>حفظ كمسودة خاصة</button>
   <button className="admin-btn is-primary" disabled={busy||!text.trim()||(status?.approved==='current'&&!status.pending&&!edited)} onClick={()=>void approve()}>اعتماد للنشر</button>
   {content.translations?.[key]&&<button className="admin-btn" disabled={busy} onClick={()=>void withdraw()}>سحب الاعتماد</button>}
   {content.translationDrafts?.[key]&&<button className="admin-btn" disabled={busy} onClick={()=>void discard()}>حذف المسودة الخاصة</button>}
   <a className="admin-btn" href="#publish">النشر والحساب ←</a>
  </div>
  <p className={`assist-status${message.error?' is-error':''}`} role="status">{busy?'جارٍ التنفيذ…':message.text}</p>
 </div>
}

export function AdminTranslations({content,save}:Props){
 const sources=translationSources(content)
 const [key,setKey]=useState<TranslationKey>(sources[1]?.key??'bio')
 const source=sources.find(s=>s.key===key)??sources[0]
 return <section className="admin-card">
  <p className="admin-muted">الترجمة مسودة خاصة حتى تعتمدها، والمعتمد لا يظهر للزوار إلا بعد النشر. تعديل النص العربي يحجب ترجمته المعتمدة حتى تراجعها من جديد.</p>
  <label className="admin-field"><span className="admin-field-label">النص</span><select value={source.key} onChange={e=>setKey(e.target.value as TranslationKey)}>{sources.map(s=><option key={s.key} value={s.key}>{s.label}{content.translations?.[s.key]?' ✓':''}</option>)}</select></label>
  <TranslationEditor key={source.key} content={content} save={save} source={source}/>
 </section>
}
