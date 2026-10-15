import { useEffect, useRef, useState } from 'react'
import config from '../auth-config.json'
import { captchaConfigured } from '../lib/auth-security'

type Turnstile = { render: (element: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void }
declare global { interface Window { turnstile?: Turnstile } }
function failureMessage(code: string) {
 if(code==='110200')return 'عنوان الصفحة غير مسموح للتحقق. افتح الموقع من kumeelalnahab.com.'
 if(['110100','110110','400020','400070'].includes(code))return 'تعذّر تشغيل مفتاح التحقق. تواصل مع إدارة الموقع.'
 if(['110600','110620'].includes(code))return 'انتهت مهلة التحقق. أعد المحاولة.'
 if(code==='200100')return 'تحقق من ضبط وقت جهازك تلقائيًا، ثم أعد المحاولة.'
 return 'تعذّر إكمال التحقق. أعد المحاولة، أو افتح الموقع مباشرة في متصفح محدّث. إذا استمر الخطأ، جرّب دون مانع إعلانات أو VPN.'
}
export function AuthCaptcha({onToken}:{onToken:(token:string)=>void}) {
 const target=useRef<HTMLDivElement>(null)
 const [error,setError]=useState('')
 const [attempt,setAttempt]=useState(0)
 useEffect(()=>{
  if(!captchaConfigured)return
  let id:string|undefined;let active=true
  const render=()=>{
   if(!active||!target.current||!window.turnstile||id)return
   try { id=window.turnstile.render(target.current,{
    sitekey:config.turnstileSiteKey,theme:'light',language:'ar',size:'flexible',
    callback:(token:string)=>{if(active){setError('');onToken(token)}},
    'expired-callback':()=>{if(active){onToken('');setError('110600')}},
    'timeout-callback':()=>{if(active){onToken('');setError('110620')}},
    'error-callback':(code:string)=>{if(active){onToken('');setError(String(code))}return true},
   }) } catch { if(active){onToken('');setError('render')} }
  }
  let script=document.getElementById('kumeel-turnstile') as HTMLScriptElement|null
  if(script?.dataset.failed==='true'){script.remove();script=null}
  const failed=()=>{if(script)script.dataset.failed='true';if(active){onToken('');setError('network')}}
  if(!script){
   script=document.createElement('script');script.id='kumeel-turnstile';script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true
   script.addEventListener('load',render);script.addEventListener('error',failed);document.head.append(script)
  } else {script.addEventListener('load',render);script.addEventListener('error',failed)}
  render()
  return()=>{active=false;script?.removeEventListener('load',render);script?.removeEventListener('error',failed);if(id)window.turnstile?.remove(id)}
 },[onToken,attempt])
 return captchaConfigured?<div className="auth-captcha"><div ref={target}/>{error&&<><p role="alert">{failureMessage(error)} {/^\d{6}$/.test(error)&&<span dir="ltr">({error})</span>}</p><button type="button" onClick={()=>{onToken('');setError('');setAttempt(v=>v+1)}}>إعادة التحقق</button></>}</div>:null
}
