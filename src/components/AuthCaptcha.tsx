import { useEffect, useRef, useState } from 'react'
import config from '../auth-config.json'
import { captchaConfigured } from '../lib/auth-security'
type Turnstile = { render: (element: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void }
declare global { interface Window { turnstile?: Turnstile } }
export function AuthCaptcha({onToken}:{onToken:(token:string)=>void}) {
 const target=useRef<HTMLDivElement>(null)
 const [error,setError]=useState(false)
 useEffect(()=>{
  if(!captchaConfigured)return
  let id:string|undefined;let active=true
  const render=()=>{if(!active||!target.current||!window.turnstile||id)return;id=window.turnstile.render(target.current,{sitekey:config.turnstileSiteKey,theme:'light',callback:onToken,'expired-callback':()=>onToken(''),'error-callback':()=>{onToken('');setError(true)}})}
  const failed=()=>{if(active){onToken('');setError(true)}}
  let script=document.getElementById('kumeel-turnstile') as HTMLScriptElement|null
  if(!script){script=document.createElement('script');script.id='kumeel-turnstile';script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;document.head.append(script)}
  script.addEventListener('load',render);script.addEventListener('error',failed);render()
  return()=>{active=false;script?.removeEventListener('load',render);script?.removeEventListener('error',failed);if(id)window.turnstile?.remove(id)}
 },[onToken])
 return captchaConfigured?<div className="auth-captcha"><div ref={target}/>{error&&<p role="alert">تعذّر تحميل التحقق. أعد تحميل الصفحة بعد استعادة الاتصال.</p>}</div>:null
}
