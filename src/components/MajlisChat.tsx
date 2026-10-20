import {lazy,Suspense,useCallback,useEffect,useState} from 'react'
import type {User} from '@supabase/supabase-js'
import {L,useLocale} from '../lib/locale-ui'
import {supabase} from '../lib/cloud'
import {joinMajlis,NAME_KEY,type MajlisSession} from '../lib/majlis-chat'
import './majlis-chat.css'

const MajlisRoom=lazy(()=>import('./MajlisRoom'))
const MajlisAudio=lazy(()=>import('./MajlisAudio'))

async function accessToken(){
 const {data:{session}}=await supabase.auth.getSession()
 if(!session)throw new Error('انتهت جلسة الدخول. سجّل الدخول مجددًا.')
 return session.access_token
}

// Members-only live room. Nothing from Stream loads until a signed-in member presses join.
export function MajlisChat(){
 const english=useLocale()==='en'
 const [user,setUser]=useState<User|null>(null),[checking,setChecking]=useState(true)
 const [name,setName]=useState(''),[session,setSession]=useState<MajlisSession|null>(null)
 const [busy,setBusy]=useState(false),[error,setError]=useState('')
 useEffect(()=>{
  try{setName(localStorage.getItem(NAME_KEY)??'')}catch{/* Name memory is optional. */}
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>{setUser(s?.user??null);setChecking(false);if(!s)setSession(null)})
  return()=>subscription.unsubscribe()
 },[])
 const refresh=useCallback(async()=>(await joinMajlis(await accessToken(),session?.name??name.trim())).token,[session?.name,name])
 async function join(e:React.FormEvent){
  e.preventDefault();if(busy)return
  setBusy(true);setError('')
  try{const s=await joinMajlis(await accessToken(),name.trim());try{localStorage.setItem(NAME_KEY,s.name)}catch{/* Optional. */}setSession(s)}
  catch(err){setError(err instanceof Error?err.message:'تعذّر الانضمام إلى المجلس.')}
  finally{setBusy(false)}
 }
 return <L.section className="majlis-chat" aria-labelledby="majlis-chat-title">
  <L.div className="majlis-chat-head">
   <L.h3 id="majlis-chat-title">حديث المجلس</L.h3>
   <L.p className="salon-muted">مساحة حيّة للأعضاء المسجّلين: مجلس صوتي يفتحه المضيف وقت اللقاء، وحديث مكتوب قبله وبعده. ارفع يدك لتتكلم، والتزم بميثاق الحوار أعلاه.</L.p>
  </L.div>
  {checking?<L.p className="majlis-status" role="status">جارٍ التحقق من الدخول…</L.p>
  :!user?<L.div className="majlis-gate"><L.p>الحديث متاح للأعضاء المسجّلين فقط.</L.p><L.a className="majlis-button" href="/member">سجّل الدخول للانضمام ←</L.a></L.div>
  :session?<>
   <L.div className="majlis-bar"><L.span>تشارك باسم <L.strong>{session.name}</L.strong></L.span><L.button type="button" onClick={()=>setSession(null)}>مغادرة الحديث</L.button></L.div>
   <Suspense fallback={null}><MajlisAudio session={session} refresh={refresh}/></Suspense>
   <Suspense fallback={<L.p className="majlis-status" role="status">جارٍ تحميل المجلس…</L.p>}><MajlisRoom session={session} refresh={refresh} english={english}/></Suspense>
  </>
  :<L.form className="majlis-gate" onSubmit={join}>
   <L.label>الاسم الذي يظهر للآخرين<L.input value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={40} required autoComplete="nickname" placeholder="مثلًا: سارة"/></L.label>
   <L.button className="majlis-button" type="submit" disabled={busy}>{busy?'جارٍ الانضمام…':'ادخل الحديث'}</L.button>
   <L.small className="salon-muted">لا يظهر بريدك الإلكتروني لأحد.</L.small>
  </L.form>}
  {error&&<L.p className="majlis-error" role="alert">{error}</L.p>}
 </L.section>
}
