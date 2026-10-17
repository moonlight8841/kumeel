import {PRIVATE_DATA_CLEARED} from '../lib/privacy'
import {safeChatHistory,type ChatMessage} from '../lib/chat-history'
import {useEffect,useRef,useState,type FormEvent} from 'react'

type Message=ChatMessage
const STORAGE='kumeel-reader-chat'
const MAX=600
const starters=['ما الفكرة التي تتكرر في المواد المنشورة؟','ما أحدث موضوع منشور يمكنني قراءته؟','بماذا أبدأ إن كنت جديدًا على المنصة؟']

function restore():Message[]{try{return safeChatHistory(JSON.parse(sessionStorage.getItem(STORAGE)||'[]'))}catch{return []}}

export function ReaderChat(){
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
 useEffect(()=>{const clear=()=>{setMessages([]);setInput('');setError('')};window.addEventListener(PRIVATE_DATA_CLEARED,clear);return()=>window.removeEventListener(PRIVATE_DATA_CLEARED,clear)},[])
 useEffect(()=>{if(open)inputRef.current?.focus()},[open])
 useEffect(()=>{listRef.current?.lastElementChild?.scrollIntoView({block:'end'})},[messages,busy])
 useEffect(()=>{if(!open)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);launcherRef.current?.focus()}};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[open])

 async function send(text:string){
  const question=text.trim()
  if(!question||busy||question.length>MAX)return
  const history:Message[]=[...messages,{role:'user',text:question}]
  setMessages(history);setInput('');setBusy(true);setError('')
  try{
   const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:history.slice(-16).map(({role,text})=>({role,text:text.slice(0,800)}))})})
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
  <button ref={launcherRef} className="chat-launcher" aria-expanded={open} aria-controls="reader-chat" onClick={()=>setOpen(!open)}><span aria-hidden="true">{open?'✕':'❝'}</span><span>{open?'إغلاق المحاور':'اسأل الكتابات'}</span></button>
  {open&&<section id="reader-chat" className="chat-panel" role="dialog" aria-modal="false" aria-labelledby="chat-title">
   <header className="chat-head">
    <div><h2 id="chat-title">محاور الكتابات</h2><p>يجيب من نصوص المنصة فقط، ويحيلك إليها.</p></div>
    <button className="chat-close" aria-label="إغلاق" onClick={()=>{setOpen(false);launcherRef.current?.focus()}}>✕</button>
   </header>
   <ol ref={listRef} className="chat-log" aria-live="polite">
    {!messages.length&&<li className="chat-welcome"><p>اسأل عن فكرة أو نص أو كتاب في المنصة. سأجيب مما كُتب هنا، وأقترح عليك من أين تقرأ.</p><div className="chat-starters">{starters.map(s=><button key={s} onClick={()=>void send(s)}>{s}</button>)}</div></li>}
    {messages.map((m,i)=><li key={i} className={`chat-msg is-${m.role}`}>
     <p>{m.text}</p>
     {m.sources&&m.sources.length>0&&<div className="chat-sources"><span>من المنصة:</span>{m.sources.map(s=><a key={s.href+s.title} href={s.href}>{s.title}</a>)}</div>}
     {m.followUp&&i===messages.length-1&&<button className="chat-follow" onClick={()=>{setInput(m.followUp??'');inputRef.current?.focus()}}>{m.followUp}</button>}
    </li>)}
    {busy&&<li className="chat-msg is-model is-typing" aria-label="المحاور يكتب"><span/><span/><span/></li>}
   </ol>
   {error&&<p className="chat-error" role="alert">{error}</p>}
   <form className="chat-form" onSubmit={submit}>
    <label className="sr-only" htmlFor="chat-input">سؤالك</label>
    <textarea id="chat-input" ref={inputRef} rows={2} maxLength={MAX} value={input} placeholder="اكتب سؤالك…" onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send(input)}}}/>
    <button className="primary" disabled={busy||!input.trim()} aria-label="إرسال">↑</button>
   </form>
   <footer className="chat-foot"><span>يُرسل السؤال وسياق المحادثة إلى مزوّد الذكاء الاصطناعي المفعّل. لا نحفظ نصها على خادم المنصة؛ تبقى نسختها في هذا التبويب. قد تخطئ الإجابة، والنص الأصلي هو المرجع.</span>{messages.length>0&&<button onClick={()=>{setMessages([]);setError('')}}>محادثة جديدة</button>}</footer>
  </section>}
 </>
}
