import {useEffect,useMemo,useRef,useState} from 'react'
import type {OwnerDraft as Content} from '../../lib/translations'
import type {Content as SiteContent} from '../../content'
import type {AdminTab} from '../../lib/admin'
import {isStarterWriting} from '../../lib/publication'
import {MAX_ROUNDS,sparringStyles,styleLabel,type SparringStyle} from '../../lib/exchange'
import {MAX_TURNS,deleteSession,listSessions,nextObjection,publishRound,saveSession,sparringError,untestedWritings,type SparringSession,type Turn} from '../../lib/sparring'

const n=(v:number)=>v.toLocaleString('ar-SA')
const when=(iso:string)=>new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',timeStyle:'short',calendar:'gregory'}).format(new Date(iso))
const styleHint:Record<SparringStyle,string>={logic:'يبحث عن مقدمة غير مسلّمة أو قفزة في الاستدلال',history:'يأتي بمثال مضاد من التاريخ أو تاريخ الأفكار',skeptic:'يسأل: ما الدليل؟ وما الذي يغيّر رأيك؟'}

export function SparringNudge({content,go}:{content:SiteContent;go:(tab:AdminTab)=>void}){
 const [count,setCount]=useState<number|null>(null)
 useEffect(()=>{let active=true;listSessions().then(s=>{if(active)setCount(untestedWritings(content,s).length)}).catch(()=>{});return()=>{active=false}},[content])
 if(!count)return null
 return <section className="admin-card admin-sparring-nudge"><span className="admin-eyebrow">المحاور</span><p>{n(count)} كتابات لم تُختبر بعد.</p><button className="admin-btn is-primary" onClick={()=>go('sparring')}>ابدأ مبارزة</button></section>
}

export function AdminSparring({content,save,onDirtyChange}:{content:Content;save:(next:Content)=>boolean;onDirtyChange?:(dirty:boolean)=>void}){
 const writings=useMemo(()=>content.writings.filter(w=>!isStarterWriting(w)),[content.writings])
 const [writingId,setWritingId]=useState(writings[0]?.id??'')
 const [style,setStyle]=useState<SparringStyle>('logic')
 const [sessions,setSessions]=useState<SparringSession[]>([])
 const [session,setSession]=useState<SparringSession|null>(null)
 const [reply,setReply]=useState('')
 const [edits,setEdits]=useState<Record<number,string>>({})
 const [busy,setBusy]=useState(false)
 const [loading,setLoading]=useState(true)
 const [message,setMessage]=useState({text:'',error:false})
 useEffect(()=>{onDirtyChange?.(busy||Boolean(reply.trim()));return()=>onDirtyChange?.(false)},[busy,reply,onDirtyChange])
 const mounted=useRef(true)
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[])
 useEffect(()=>{listSessions().then(s=>{if(mounted.current)setSessions(s)}).catch(e=>{if(mounted.current)setMessage({text:sparringError(e),error:true})}) .finally(()=>{if(mounted.current)setLoading(false)})},[])
 const say=(text:string,error=false)=>{if(mounted.current)setMessage({text,error})}
 const writing=writings.find(w=>w.id===writingId)
 const published=writing?.exchange?.length??0
 const close=()=>{setSession(null);setReply('');setEdits({})}

 async function persist(next:{id?:string;revision?:number;writing_id:string;style:SparringStyle;turns:Turn[]}){
  const saved=await saveSession(next)
  if(mounted.current){setSession(saved);setSessions(list=>[saved,...list.filter(s=>s.id!==saved.id)])}
 }
 async function challenge(base:SparringSession|null){
  if(!writing||busy)return
  const turns=base?.turns??[]
  if(turns.length>=MAX_TURNS){say(`بلغ الحوار ${n(MAX_TURNS)} دورًا. ابدأ جلسة جديدة.`,true);return}
  const s=base?.style??style
  setBusy(true);say('')
  try{const critic=await nextObjection(writing,s,turns);await persist({id:base?.id,revision:base?.revision,writing_id:writing.id,style:s,turns:[...turns,critic]})}
  catch(e){say(sparringError(e),true)}
  finally{if(mounted.current)setBusy(false)}
 }
 async function answer(andClose=false){
  if(!session||busy||!reply.trim())return
  if(session.turns.length>=MAX_TURNS){say('بلغ الحوار الحد الأقصى للأدوار.',true);return}
  setBusy(true);say('')
  try{await persist({...session,turns:[...session.turns,{role:'owner',text:reply.trim()}]});if(mounted.current){setReply('');if(andClose)close()}}
  catch(e){say(sparringError(e),true)}
  finally{if(mounted.current)setBusy(false)}
 }
 function publish(i:number){
  if(!session||!writing)return
  const text=(edits[i]??session.turns[i].text).trim()
  if(!text){say('اكتب الجواب قبل النشر.',true);return}
  try{
   const next=publishRound(content,writing.id,{style:session.style,objection:session.turns[i-1].text,reply:text})
   if(save(next))say('أُضيفت الجولة إلى المسودة. انشرها للعموم من «النشر والحساب».')
   else say('تعذّر حفظ المسودة؛ راجع طول الجواب.',true)
  }catch(e){say(sparringError(e),true)}
 }
 async function remove(s:SparringSession){
  if(busy||!window.confirm('حذف هذه الجلسة الخاصة نهائيًا؟ الجولات المنشورة تبقى في الكتابة.'))return
  setBusy(true)
  try{await deleteSession(s.id);if(mounted.current)setSessions(l=>l.filter(x=>x.id!==s.id))}
  catch(e){say(sparringError(e),true)}
  finally{if(mounted.current)setBusy(false)}
 }

 if(!writings.length)return <section className="admin-card"><h2>المحاور</h2><p>أضف كتابة معتمدة أولًا ثم اختبرها هنا.</p></section>
 const own=sessions.filter(s=>s.writing_id===writingId)
 const last=session?session.turns[session.turns.length-1]:undefined
 return <section className="admin-card admin-sparring">
  <header><h2>المحاور</h2><p className="admin-muted">اختبر كتابتك أمام اعتراض قوي. الحوار خاص بك؛ لا يظهر للزوار إلا ما تنشره من جولات.</p></header>
  <label className="admin-field"><span className="admin-field-label">الكتابة</span><select disabled={busy} value={writingId} onChange={e=>{if(reply.trim()&&!window.confirm('سيُفقد الجواب غير المحفوظ. هل تريد تغيير الكتابة؟'))return;setWritingId(e.target.value);close()}}>{writings.map(w=><option key={w.id} value={w.id}>{w.title||w.id}</option>)}</select></label>
  <p className="admin-muted">جولات في المسودة: {n(published)} من {n(MAX_ROUNDS)}</p>
  {loading&&<p role="status">جارٍ تحميل الجلسات الخاصة…</p>}
  {!session&&<>
   <fieldset className="admin-field"><legend className="admin-field-label">اختر المحاور</legend>{sparringStyles.map(s=><label key={s} className="admin-check"><input type="radio" name="sparring-style" checked={style===s} onChange={()=>setStyle(s)}/> <b>{styleLabel[s]}</b> — {styleHint[s]}</label>)}</fieldset>
   <button className="admin-btn is-primary" disabled={busy||loading||!writing} onClick={()=>void challenge(null)}>{busy?'المحاور يفكّر…':'ابدأ المبارزة'}</button>
   {own.length>0&&<><h3>جلسات سابقة</h3><ul className="admin-list">{own.map(s=><li key={s.id}><button className="admin-btn is-quiet" disabled={busy} onClick={()=>{setSession(s);setEdits({})}}>{styleLabel[s.style]} · {n(s.turns.length)} أدوار · {when(s.updated_at)}</button><button className="admin-btn is-danger" disabled={busy} onClick={()=>void remove(s)}>حذف</button></li>)}</ul></>}
  </>}
  {session&&<>
   <p className="admin-muted">{styleLabel[session.style]} · {n(session.turns.filter(t=>t.role==='owner').length)} جولات مكتملة · {n(session.turns.length)} من {n(MAX_TURNS)} دورًا محفوظًا</p>
   <ol className="sparring-turns">{session.turns.map((t,i)=><li key={i} className={`is-${t.role}`}>
    <strong>{t.role==='critic'?`المحاور ${styleLabel[session.style]}`:'جوابك'}</strong>
    {t.quote&&<blockquote>«{t.quote}»</blockquote>}
    <p className="preserve-lines">{t.text}</p>
    {t.role==='owner'&&session.turns[i-1]?.role==='critic'&&<details><summary>انشر هذه الجولة</summary><label className="admin-field"><span className="admin-field-label">صياغة الجواب المنشور</span><textarea maxLength={4000} value={edits[i]??t.text} onChange={e=>setEdits(d=>({...d,[i]:e.target.value}))}/></label><button className="admin-btn" disabled={busy||published>=MAX_ROUNDS} onClick={()=>publish(i)}>أضف إلى المسودة</button>{published>=MAX_ROUNDS&&<small className="admin-muted"> بلغت الكتابة الحد الأقصى للجولات المنشورة.</small>}</details>}
   </li>)}</ol>
   {last?.role==='critic'
    ?<form onSubmit={e=>{e.preventDefault();void answer()}}><label className="admin-field"><span className="admin-field-label">جوابك</span><textarea required maxLength={4000} value={reply} disabled={busy} onChange={e=>setReply(e.target.value)}/></label><small className="admin-muted">{n(reply.length)} / {n(4000)}</small> <button className="admin-btn is-primary" disabled={busy||!reply.trim()}>احفظ جوابك</button></form>
    :<button className="admin-btn is-primary" disabled={busy||session.turns.length>=MAX_TURNS} onClick={()=>void challenge(session)}>{busy?'المحاور يفكّر…':session.turns.length>=MAX_TURNS?'اكتملت الجلسة — ابدأ جلسة جديدة':'اعترض مجددًا'}</button>}
   <div className="admin-sparring-actions"><button className="admin-btn" disabled={busy} onClick={()=>{if(reply.trim())void answer(true);else close()}}>{reply.trim()?'احفظ الجواب وأغلق':'أغلق الجلسة المحفوظة'}</button><button className="admin-btn" disabled={busy} onClick={()=>{if(reply.trim()&&!window.confirm('سيُفقد الجواب غير المحفوظ. هل تريد بدء جلسة أخرى؟'))return;const currentStyle=session.style;close();setStyle(sparringStyles[(sparringStyles.indexOf(currentStyle)+1)%sparringStyles.length])}}>محاور آخر</button></div>
  </>}
  <p role="status" className={message.error?'admin-error':'admin-muted'}>{message.text}</p>
 </section>
}
