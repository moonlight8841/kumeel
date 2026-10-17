import {useEffect,useState,type FormEvent} from 'react'
import {supabase} from '../lib/cloud'
import {statusLabel} from '../lib/community'
import {listMyResponses,listResponses,responseError,sendResponse,type OwnResponse,type PublicResponse} from '../lib/writing-responses'
type Viewer='unknown'|'guest'|'unconfirmed'|'member'
const date=(iso:string)=>new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',calendar:'gregory'}).format(new Date(iso))
export function WritingResponses({writingId}:{writingId:string}){
 const [items,setItems]=useState<PublicResponse[]>([]),[mine,setMine]=useState<OwnResponse[]>([]),[viewer,setViewer]=useState<Viewer>('unknown')
 const [name,setName]=useState(''),[body,setBody]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[version,setVersion]=useState(0)
 useEffect(()=>{let active=true;listResponses(writingId).then(d=>{if(active)setItems(d)}).catch(e=>{if(active)setMessage(responseError(e))});return()=>{active=false}},[writingId,version])
 useEffect(()=>{let active=true;const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{if(!active)return;const user=s?.user;setViewer(!user?'guest':user.email_confirmed_at?'member':'unconfirmed');if(user)listMyResponses(writingId,user.id).then(d=>{if(active)setMine(d)}).catch(()=>{});else setMine([])});return()=>{active=false;subscription.unsubscribe()}},[writingId,version])
 useEffect(()=>{if(!body.trim())return;const h=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue=''};window.addEventListener('beforeunload',h);return()=>window.removeEventListener('beforeunload',h)},[body])
 async function submit(e:FormEvent){e.preventDefault();if(busy)return;setBusy(true);setMessage('');try{await sendResponse(writingId,name,body);setBody('');setMessage('أُرسل رأيك للمراجعة. لن يظهر للناس حتى تعتمده الإدارة.');setVersion(v=>v+1)}catch(err){setMessage(responseError(err))}finally{setBusy(false)}}
 const login=`/member?next=${encodeURIComponent(`/writings/${encodeURIComponent(writingId)}#responses`)}`
 return <section id="responses" className="community-discussion writing-responses" aria-labelledby="responses-title"><h2 id="responses-title">آراء القراء</h2><p>أنصف الفكرة ثم أضف سؤالًا أو اعتراضًا. يظهر الرأي بعد المراجعة.</p>
  {items.length===0&&!message&&<p className="sample-note">لا آراء منشورة بعد. كن أول من يكتب.</p>}
  {items.map(r=><article key={r.id}><strong>{r.author_name}</strong> <small>{date(r.published_at)}</small><p className="preserve-lines">{r.body}</p></article>)}
  {mine.map(r=><article key={r.id} className="is-own"><strong>{r.author_name}</strong> <small>رأيك · {statusLabel[r.status]}</small><p className="preserve-lines">{r.body}</p></article>)}
  {viewer==='member'&&<form onSubmit={e=>void submit(e)}><h3>اكتب رأيك</h3><label>اسم العرض<input required minLength={2} maxLength={60} value={name} disabled={busy} onChange={e=>setName(e.target.value)}/></label><label>رأيك<textarea required minLength={10} maxLength={2000} value={body} disabled={busy} onChange={e=>setBody(e.target.value)}/></label><small>{body.length.toLocaleString('ar-SA')} / ٢٠٠٠</small><button className="primary" disabled={busy}>{busy?'جارٍ الإرسال…':'أرسل للمراجعة'}</button></form>}
  {viewer==='guest'&&<a className="primary" href={login}>سجّل الدخول لتكتب رأيك</a>}
  {viewer==='unconfirmed'&&<p>أكّد بريدك الإلكتروني أولًا لتكتب رأيك.</p>}
  <p role="status">{message}</p>
 </section>
}
