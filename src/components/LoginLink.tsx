import {useEffect,useId,useRef,useState} from 'react'
import type {User} from '@supabase/supabase-js'
import {L} from '../lib/locale-ui'
import {supabase} from '../lib/cloud'
import {NAME_KEY} from '../lib/majlis-chat'

const PersonIcon=()=><L.svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><L.circle cx="12" cy="8" r="3.5"/><L.path d="M5 21v-2a7 7 0 0 1 14 0v2"/></L.svg>

function initialFor(user:User){
 let name=''
 try{name=localStorage.getItem(NAME_KEY)??''}catch{/* Optional. */}
 return ([...(name.trim()||user.email||'?')][0]??'?').toLocaleUpperCase()
}

// Header account entry: a sign-in link for visitors, an account menu once signed in.
export function LoginLink(){
 const [user,setUser]=useState<User|null>(null),[checked,setChecked]=useState(false),[open,setOpen]=useState(false)
 const menuId=useId(),root=useRef<HTMLDivElement>(null)
 useEffect(()=>{
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{setUser(session?.user??null);setChecked(true);if(!session)setOpen(false)})
  return()=>subscription.unsubscribe()
 },[])
 useEffect(()=>{
  if(!open)return
  const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)}
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);root.current?.querySelector('button')?.focus()}}
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape)
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)}
 },[open])
 if(!user)return <L.a className={`login-entry${checked?'':' is-checking'}`} href="/member" aria-label="تسجيل الدخول إلى حسابك"><PersonIcon/><L.span>تسجيل الدخول</L.span></L.a>
 // The member page has its own sign-out that protects unsaved drafts.
 const onMemberPage=typeof location!=='undefined'&&/\/member\/?$/.test(location.pathname)
 return <L.div className="account-entry" ref={root}>
  <L.button type="button" className="login-entry is-signed-in" aria-expanded={open} aria-controls={menuId} aria-label="حسابك: أنت مسجّل الدخول" onClick={()=>setOpen(!open)}>
   <L.span className="account-avatar" aria-hidden="true">{initialFor(user)}<L.i className="account-dot"/></L.span><L.span>حسابي</L.span>
  </L.button>
  {open&&<L.div id={menuId} className="account-menu">
   <L.p className="account-status"><L.i className="account-dot" aria-hidden="true"/>مسجّل الدخول</L.p>
   {user.email&&<L.p className="account-email" dir="ltr">{user.email}</L.p>}
   <L.a href="/member">مساحة العضو</L.a>
   <L.a href="/salon#majlis-chat-title">حديث المجلس</L.a>
   {!onMemberPage&&<L.button type="button" onClick={()=>{void supabase.auth.signOut({scope:'local'})}}>تسجيل الخروج</L.button>}
  </L.div>}
 </L.div>
}
