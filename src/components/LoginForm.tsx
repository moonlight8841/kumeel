import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/cloud'

export function LoginForm() {
 const [method,setMethod]=useState<'password'|'link'>('password')
 const [email,setEmail]=useState('kumeelalnahab@gmail.com')
 const [visible,setVisible]=useState(false)
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [failed,setFailed]=useState(false)
 async function submit(e:FormEvent<HTMLFormElement>) {
  e.preventDefault();if(busy)return
  const form=e.currentTarget;const data=new FormData(form)
  setBusy(true);setMessage('');setFailed(false)
  try {
   if(method==='password') {
    const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password:String(data.get('password'))})
    if(error)throw new Error(error.status===429?'محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا.':'تعذّر الدخول. تحقق من البريد وكلمة المرور واتصال الشبكة.')
    form.reset();setMessage('تم الدخول. جارٍ التحقق من صلاحيات الحساب…')
   } else {
    const {error}=await supabase.auth.signInWithOtp({email:email.trim(),options:{shouldCreateUser:true,emailRedirectTo:window.location.origin+'/admin'}})
    if(error)throw new Error(error.status===429?'أُرسل طلب مؤخرًا. انتظر قليلًا قبل إعادة المحاولة.':'تعذّر إرسال الرابط. تحقق من الاتصال وإعدادات البريد.')
    setMessage('تحقّق من بريدك، بما فيه الرسائل غير المرغوبة. إذا أمكن إرسال رابط الدخول فستجده هناك. افتحه على هذا الجهاز للمتابعة.')
   }
  } catch(error) {setFailed(true);setMessage(error instanceof Error?error.message:'تعذّر الاتصال. حاول مجددًا.')}
  finally {setBusy(false)}
 }
 return <section className="login-card" aria-labelledby="login-title"><div className="login-mark" aria-hidden="true">✦</div><span className="section-label">مساحة كميل ال نهاب</span><h2 id="login-title">أهلًا بعودتك.</h2><p className="login-intro">كل فكرة تبدأ من هنا. ادخل إلى مساحتك لإدارة المحتوى ومتابعة النشر.</p><div className="login-methods" role="group" aria-label="طريقة الدخول"><button type="button" disabled={busy} aria-pressed={method==='password'} onClick={()=>{setMethod('password');setMessage('')}}>كلمة المرور</button><button type="button" disabled={busy} aria-pressed={method==='link'} onClick={()=>{setMethod('link');setMessage('')}}>رابط عبر البريد</button></div><form onSubmit={submit} aria-busy={busy}><label htmlFor="login-email">البريد الإلكتروني</label><input id="login-email" name="email" type="email" dir="ltr" autoComplete="username" required maxLength={254} value={email} disabled={busy} onChange={e=>setEmail(e.target.value)}/>{method==='password'?<><label htmlFor="login-password">كلمة المرور</label><div className="login-password"><input id="login-password" name="password" type={visible?'text':'password'} autoComplete="current-password" required disabled={busy}/><button type="button" disabled={busy} aria-label={visible?'إخفاء كلمة المرور':'إظهار كلمة المرور'} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?'إخفاء':'إظهار'}</button></div><button className="login-forgot" type="button" disabled={busy} onClick={()=>{setMethod('link');setMessage('يمكنك الدخول عبر رابط البريد دون كلمة مرور.')}}>نسيت كلمة المرور؟ ادخل برابط البريد</button></>:<p className="login-link-note">سنرسل رابطًا لتأكيد ملكيتك للبريد والدخول دون كلمة مرور. إن لم يكن لديك حساب، يُنشأ بعد تأكيد بريدك وفق إعدادات الموقع.</p>}<button className="primary login-submit" disabled={busy}>{busy?'جارٍ الاتصال…':method==='password'?'تسجيل الدخول ←':'أرسل رابط الدخول ←'}</button><p className={failed?'login-message error':'login-message'} role={failed?'alert':'status'}>{message}</p></form><p className="login-footnote">تسجيل الحساب لا يمنح صلاحيات الإدارة تلقائيًا. تُفتح أدوات الإدارة للحسابات المخوّلة فقط.</p></section>
}
