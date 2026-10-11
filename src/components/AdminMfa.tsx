import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/cloud'

export function AdminMfa({onVerified}:{onVerified:()=>void}) {
 const [factor,setFactor]=useState('')
 const [loaded,setLoaded]=useState(false)
 const [qr,setQr]=useState('')
 const [secret,setSecret]=useState('')
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 useEffect(()=>{let active=true;supabase.auth.mfa.listFactors().then(({data,error})=>{if(!active)return;if(error){setMessage('تعذّر تحميل إعدادات المصادقة. أعد تحميل الصفحة بعد استعادة الاتصال.');return}setFactor(data.totp[0]?.id??'');setLoaded(true)});return()=>{active=false}},[])
 async function enroll() {
  if(busy)return;setBusy(true);setMessage('')
  try {
   const {data:existing,error:listError}=await supabase.auth.mfa.listFactors()
   if(listError)throw listError
   for(const pending of existing.all.filter(f=>f.factor_type==='totp'&&f.status==='unverified'&&f.friendly_name==='Kumeel administration')) {
    const {error}=await supabase.auth.mfa.unenroll({factorId:pending.id});if(error)throw error
   }
   const {data,error}=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:'Kumeel administration',issuer:'Kumeel Al Nahab'})
   if(error)throw error
   setFactor(data.id);setQr(data.totp.qr_code);setSecret(data.totp.secret)
  } catch {setMessage('تعذّر إعداد المصادقة الثنائية. تحقق من الاتصال وإعدادات MFA في Supabase.')}
  finally {setBusy(false)}
 }
 async function verify(e:FormEvent<HTMLFormElement>) {
  e.preventDefault();if(busy||!factor)return
  const form=e.currentTarget;const code=String(new FormData(form).get('code')||'').trim()
  if(!/^\d{6}$/.test(code))return
  setBusy(true);setMessage('')
  try {
   const {error}=await supabase.auth.mfa.challengeAndVerify({factorId:factor,code})
   if(error)throw error
   form.reset();setQr('');setSecret('');onVerified()
  } catch {setMessage('تعذّر التحقق. استخدم الرمز الحالي من تطبيق المصادقة، ثم حاول مجددًا.')}
  finally {setBusy(false)}
 }
 return <section className="admin-mfa"><span className="section-label">حماية حساب الإدارة</span><h3>خطوة إضافية تحمي أثرَك.</h3><p>أدوات الإدارة تتطلب تأكيد البريد ورمزًا من تطبيق مصادقة، بالإضافة إلى تسجيل الدخول.</p>{!loaded?<p role="status">{message||'جارٍ تحميل إعدادات الحماية…'}</p>:!factor?<button className="primary" disabled={busy} onClick={()=>void enroll()}>{busy?'جارٍ الإعداد…':'إعداد تطبيق المصادقة'}</button>:<>{qr&&<div className="mfa-setup"><p>امسح الرمز بتطبيق المصادقة، ثم أدخل الرمز المكوّن من ٦ أرقام. احتفظ بنسخة آمنة من مفتاح الإعداد لاستعادة التطبيق؛ لا تشاركه.</p><img width="220" height="220" src={`data:image/svg+xml,${encodeURIComponent(qr)}`} alt="رمز إعداد تطبيق المصادقة لحسابك"/><details><summary>مفتاح الإعداد اليدوي</summary><code dir="ltr">{secret}</code></details></div>}<form onSubmit={verify}><label htmlFor="mfa-code">رمز تطبيق المصادقة</label><input id="mfa-code" name="code" type="text" dir="ltr" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required disabled={busy}/><button className="primary" disabled={busy}>{busy?'جارٍ التحقق…':'تحقق وافتح الإدارة'}</button></form></>}{loaded&&<p role="status">{message}</p>}</section>
}
