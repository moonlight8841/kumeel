import {L,useLocale} from '../lib/locale-ui'
import {useEffect,useRef,useState,type FormEvent} from 'react'

type Source={title:string;href:string}
type Message={role:'user'|'model';text:string;sources?:Source[];followUp?:string}
const STORAGE='kumeel-reader-chat'
const MAX=600
const starters=['ما الفكرة التي تتكرر في المواد المنشورة؟','ما أحدث موضوع منشور يمكنني قراءته؟','بماذا أبدأ إن كنت جديدًا على المنصة؟']

function restore():Message[]{try{const v:unknown=JSON.parse(sessionStorage.getItem(STORAGE)||'[]');return Array.isArray(v)?v.filter((m):m is Message=>m&&typeof m==='object'&&['user','model'].includes(m.role)&&typeof m.text==='string').slice(-16):[]}catch{return []}}

export function ReaderChat(){
 const locale=useLocale()
 const [enabled,setEnabled]=useState(false)
 const [open,setOpen]=useState(false)
 const [messages,setMessages]=useState<Message[]>([])
 const [input,setInput]=useState('')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const inputRef=useRef<HTMLTextAreaElement>(null)
 const launcherRef=useRef<HTMLButtonElement>(null)
 const listRef=useRef<HTMLOListElement>(null)

 // Server decides availability; nothing renders during SSR or when disabled.
 useEffect(()=>{let live=true;fetch('/api/chat').then(r=>r.ok?r.json():null).then(d=>{if(live&&d?.enabled===true){setEnabled(true);setMessages(restore())}}).catch(()=>{});return()=>{live=false}},[])
 useEffect(()=>{if(!enabled)return;try{sessionStorage.setItem(STORAGE,JSON.stringify(messages.slice(-16)))}catch{/* Memory-only conversation. */}},[messages,enabled])
 useEffect(()=>{if(open)inputRef.current?.focus()},[open])
 useEffect(()=>{listRef.current?.lastElementChild?.scrollIntoView({block:'end'})},[messages,busy])
 useEffect(()=>{if(!open)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);launcherRef.current?.focus()}};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[open])

 async function send(text:string){
  const question=text.trim()
  if(!question||busy||question.length>MAX)return
  const history:Message[]=[...messages,{role:'user',text:question}]
  setMessages(history);setInput('');setBusy(true);setError('')
  try{
   const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({locale,messages:history.slice(-16).map(({role,text})=>({role,text:text.slice(0,800)}))})})
   const body=await response.json().catch(()=>null)
   if(!response.ok||!body?.success)throw new Error(typeof body?.error==='string'?body.error:'تعذّر الحصول على إجابة.')
   setMessages(m=>[...m,{role:'model',text:body.data.answer,sources:body.data.sources,followUp:body.data.followUp||undefined}])
  }catch(e){
   setError(e instanceof Error?e.message:'تعذّر الاتصال.')
   setMessages(m=>m.slice(0,-1));setInput(question) // let the reader retry without retyping
  }finally{setBusy(false)}
 }
 function submit(e:FormEvent){e.preventDefault();void send(input)}

 if(!enabled)return null
 return <>
  <L.button ref={launcherRef} className="chat-launcher" aria-expanded={open} aria-controls="reader-chat" onClick={()=>setOpen(!open)}><L.span aria-hidden="true">{open?'✕':'❝'}</L.span><L.span>{open?'إغلاق المحاور':'اسأل الكتابات'}</L.span></L.button>
  {open&&<L.section id="reader-chat" className="chat-panel" role="dialog" aria-modal="false" aria-labelledby="chat-title">
   <L.header className="chat-head">
    <L.div><L.h2 id="chat-title">محاور الكتابات</L.h2><L.p>يجيب من نصوص المنصة فقط، ويحيلك إليها.</L.p></L.div>
    <L.button className="chat-close" aria-label="إغلاق" onClick={()=>{setOpen(false);launcherRef.current?.focus()}}>✕</L.button>
   </L.header>
   <L.ol ref={listRef} className="chat-log" aria-live="polite">
    {!messages.length&&<L.li className="chat-welcome"><L.p>اسأل عن فكرة أو نص أو كتاب في المنصة. سأجيب مما كُتب هنا، وأقترح عليك من أين تقرأ.</L.p><L.div className="chat-starters">{starters.map(s=><L.button key={s} onClick={()=>void send(s)}>{s}</L.button>)}</L.div></L.li>}
    {messages.map((m,i)=><L.li key={i} className={`chat-msg is-${m.role}`}>
     <L.p>{m.text}</L.p>
     {m.sources&&m.sources.length>0&&<L.div className="chat-sources"><L.span>من المنصة:</L.span>{m.sources.map(s=><L.a key={s.href+s.title} href={s.href}>{s.title}</L.a>)}</L.div>}
     {m.followUp&&i===messages.length-1&&<L.button className="chat-follow" onClick={()=>{setInput(m.followUp??'');inputRef.current?.focus()}}>{m.followUp}</L.button>}
    </L.li>)}
    {busy&&<L.li className="chat-msg is-model is-typing" aria-label="المحاور يكتب"><L.span/><L.span/><L.span/></L.li>}
   </L.ol>
   {error&&<L.p className="chat-error" role="alert">{error}</L.p>}
   <L.form className="chat-form" onSubmit={submit}>
    <L.label className="sr-only" htmlFor="chat-input">سؤالك</L.label>
    <L.textarea id="chat-input" ref={inputRef} rows={2} maxLength={MAX} value={input} placeholder="اكتب سؤالك…" onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send(input)}}}/>
    <L.button className="primary" disabled={busy||!input.trim()} aria-label="إرسال">↑</L.button>
   </L.form>
   <L.footer className="chat-foot"><L.span>إجابات آلية عبر Gemini وقد تخطئ؛ النص الأصلي هو المرجع. لا نحفظها على الخادم.</L.span>{messages.length>0&&<L.button onClick={()=>{setMessages([]);setError('')}}>محادثة جديدة</L.button>}</L.footer>
  </L.section>}
 </>
}
