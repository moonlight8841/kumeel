import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../lib/cloud'
import { MIN_PASSWORD_LENGTH, safeAuthReturnUrl, validNewPassword, captchaConfigured } from '../lib/auth-security'
import { AuthCaptcha } from './AuthCaptcha'

export function LoginForm() {
 const [method,setMethod]=useState<'password'|'link'|'signup'|'recovery'>('password')
 const [email,setEmail]=useState('')
 const [visible,setVisible]=useState(false)
 const [busy,setBusy]=useState(false)
 const lock=useRef(false)
 const [message,setMessage]=useState('')
 const [failed,setFailed]=useState(false)
 const [cooldown,setCooldown]=useState(0)
 const [captchaToken,setCaptchaToken]=useState('')
 const [captchaVersion,setCaptchaVersion]=useState(0)
 useEffect(()=>{const url=new URL(window.location.href);if(url.searchParams.has('error')||url.hash.includes('error=')){setFailed(true);setMessage('رابط الدخول انتهى أو تعذّر التحقق منه. اطلب رابطًا جديدًا وافتحه في المتصفح نفسه.')}},[])
 useEffect(()=>{if(!cooldown)return;const timer=setInterval(()=>setCooldown(v=>Math.max(0,v-1)),1000);return()=>clearInterval(timer)},[cooldown])
 function change(next:typeof method){setMethod(next);setMessage('');setFailed(false);setVisible(false);setCaptchaToken('');setCaptchaVersion(v=>v+1)}
 async function submit(e:FormEvent<HTMLFormElement>) {
  e.preventDefault();if(lock.current||cooldown)return
  if(captchaConfigured&&!captchaToken){setFailed(true);setMessage('أكمل التحقق قبل المتابعة.');return}
  const form=e.currentTarget;const data=new FormData(form);const password=String(data.get('password')||'')
  if(method==='signup'&&(!validNewPassword(password)||password!==String(data.get('confirm')))){setFailed(true);setMessage(`اختر كلمة مرور بين ${MIN_PASSWORD_LENGTH} و١٢٨ حرفًا، وأعد كتابتها كما هي.`);return}
  lock.current=true;setBusy(true);setMessage('');setFailed(false)
  try {
   const redirect=safeAuthReturnUrl(window.location.origin)
   if(method==='password') {
    const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password,options:{captchaToken:captchaToken||undefined}})
    if(error){setCooldown(error.status===429?60:3);throw new Error(error.status===429?'محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا.':'تعذّر الدخول. تحقق من بيانات الدخول واتصال الشبكة.')}
    form.reset();setMessage('تم الدخول. جارٍ التحقق من صلاحيات الحساب…')
   } else if(method==='signup') {
    const {data:result,error}=await supabase.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:redirect,captchaToken:captchaToken||undefined}})
    if(error?.status===429){setCooldown(60);throw new Error('طلبات كثيرة. انتظر قليلًا قبل المحاولة التالية.')}
    if(error&&(!error.status||error.status>=500))throw new Error('تعذّر الاتصال. حاول مجددًا لاحقًا.')
    if(result.session)await supabase.auth.signOut({scope:'local'})
    form.reset();setCooldown(60)
    setMessage('إذا كان التسجيل متاحًا لهذا البريد فستصلك رسالة تأكيد. راجع البريد والرسائل غير المرغوبة، ثم أكّد بريدك قبل الدخول. إن كان لديك حساب، استخدم تسجيل الدخول.')
   } else if(method==='recovery'){
    const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:redirect+'?reset=1',captchaToken:captchaToken||undefined})
    if(error){setCooldown(error.status===429?60:3);throw new Error(error.status===429?'طلبات كثيرة. انتظر دقيقة قبل طلب رسالة أخرى.':'تعذّر إرسال رسالة الاستعادة. أعد التحقق وحاول مجددًا.')}
    setCooldown(60);setMessage('إذا كان البريد مسجّلًا فستصلك رسالة لتعيين كلمة مرور جديدة. افتح أحدث رسالة في المتصفح نفسه الذي طلبتها منه.')
   } else {
    const {error}=await supabase.auth.signInWithOtp({email:email.trim(),options:{shouldCreateUser:false,emailRedirectTo:redirect,captchaToken:captchaToken||undefined}})
    if(error?.status===429){setCooldown(60);throw new Error('أُرسل طلب مؤخرًا. انتظر قليلًا قبل إعادة المحاولة.')}
    if(error&&(!error.status||error.status>=500))throw new Error('تعذّر الاتصال. حاول مجددًا لاحقًا.')
    setCooldown(60);setMessage('إذا كان لديك حساب بهذا البريد فستصلك رسالة الدخول. افتح الرابط على المتصفح نفسه، وراجع الرسائل غير المرغوبة أيضًا.')
   }
  } catch(error) {setFailed(true);setMessage(error instanceof Error?error.message:'تعذّر الاتصال. حاول مجددًا.')}
  finally {lock.current=false;setBusy(false);setCaptchaToken('');setCaptchaVersion(v=>v+1)}
 }
 const blocked=busy||cooldown>0
 return <section className="login-card" aria-labelledby="login-title"><div className="login-mark" aria-hidden="true">✦</div><span className="section-label">مساحة كميل ال نهاب</span><h2 id="login-title">{method==='signup'?'خطوتك الأولى إلى المعرفة.':'أهلًا بعودتك.'}</h2><p className="login-intro">{method==='signup'?'أنشئ حساب قارئ وابدأ رحلتك. حسابات الزوار مستقلة عن صلاحيات الإدارة.':'ادخل إلى حسابك. أدوات الإدارة متاحة للحسابات المخوّلة فقط.'}</p><div className="login-methods" role="group" aria-label="طريقة الدخول">{([['password','كلمة المرور'],['link','رابط عبر البريد'],['signup','حساب جديد']] as const).map(([key,label])=><button key={key} type="button" disabled={busy} aria-pressed={method===key} onClick={()=>change(key)}>{label}</button>)}</div><form key={method} onSubmit={submit} aria-busy={busy}><label htmlFor="login-email">البريد الإلكتروني</label><input id="login-email" name="email" type="email" dir="ltr" autoComplete="username" required maxLength={254} value={email} disabled={busy} onChange={e=>setEmail(e.target.value)}/>{(method==='password'||method==='signup')?<><label htmlFor="login-password">كلمة المرور</label><div className="login-password"><input id="login-password" name="password" type={visible?'text':'password'} autoComplete={method==='signup'?'new-password':'current-password'} required minLength={method==='signup'?MIN_PASSWORD_LENGTH:undefined} maxLength={128} disabled={busy}/><button type="button" disabled={busy} aria-label={visible?'إخفاء كلمة المرور':'إظهار كلمة المرور'} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?'إخفاء':'إظهار'}</button></div>{method==='signup'?<><p className="login-link-note">١٤ حرفًا على الأقل. استخدم عبارة طويلة وفريدة أو مدير كلمات مرور.</p><label htmlFor="signup-confirm">تأكيد كلمة المرور</label><input id="signup-confirm" name="confirm" type="password" autoComplete="new-password" required maxLength={128} disabled={busy}/></>:<button className="login-forgot" type="button" disabled={busy} onClick={()=>change('link')}>نسيت كلمة المرور؟ ادخل برابط البريد</button>}</>:<p className="login-link-note">رابط البريد مخصص للحسابات الموجودة. لإنشاء حساب، اختر «حساب جديد» وأكّد بريدك.</p>}<AuthCaptcha key={captchaVersion} onToken={setCaptchaToken}/><button className="primary login-submit" disabled={blocked||Boolean(captchaConfigured&&!captchaToken)}>{busy?'جارٍ الاتصال…':cooldown?`أعد المحاولة بعد ${cooldown} ثانية`:method==='password'?'تسجيل الدخول ←':method==='signup'?'إنشاء الحساب ←':'أرسل رابط الدخول ←'}</button><p className={failed?'login-message error':'login-message'} role={failed?'alert':'status'}>{message}</p></form><p className="login-footnote">تأكيد البريد مطلوب. لا يمنح إنشاء الحساب صلاحية الإدارة، والجلسة محفوظة في هذا التبويب.</p></section>
}
