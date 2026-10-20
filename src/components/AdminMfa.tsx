import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../lib/cloud'
import {normalizeTotp,totpQrPng} from '../lib/mfa'

export function AdminMfa({onVerified}:{onVerified:()=>void}) {
 const [factor,setFactor]=useState('')
 const [loaded,setLoaded]=useState(false)
 const [qr,setQr]=useState('')
 const [secret,setSecret]=useState('')
 const [verified,setVerified]=useState(false)
 const [qrFailed,setQrFailed]=useState(false)
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [code,setCode]=useState('')
 const lock=useRef(false)
 const instructions=<div className="mfa-instructions"><p><strong>الرمز من تطبيق المصادقة، وليس من رسالة البريد.</strong></p><ol><li>اضغط «إعداد تطبيق المصادقة» لإظهار رمز QR.</li><li>أضف الحساب داخل تطبيق المصادقة على هاتفك بمسح الرمز. على الهاتف نفسه، استخدم مفتاح الإعداد اليدوي واختر رمزًا زمنيًا (TOTP).</li><li>أدخل الأرقام الستة الظاهرة في التطبيق. اضبط وقت الهاتف تلقائيًا إن رُفض الرمز.</li></ol></div>
 useEffect(()=>{let active=true;supabase.auth.mfa.listFactors().then(({data,error})=>{if(!active)return;if(error){setMessage('تعذّر تحميل إعدادات المصادقة. أعد تحميل الصفحة بعد استعادة الاتصال.');return}const existing=data.all.find(f=>f.factor_type==='totp'&&f.status==='verified');setFactor(existing?.id??'');setVerified(Boolean(existing));if(!existing&&data.all.some(f=>f.factor_type==='totp'&&f.status==='unverified'))setMessage('الإعداد السابق غير مكتمل. اضغط إعداد تطبيق المصادقة لإظهار رمز جديد.');setLoaded(true)}).catch(()=>{if(active)setMessage('تعذّر تحميل إعدادات المصادقة. أعد تحميل الصفحة بعد استعادة الاتصال.')});return()=>{active=false}},[])
 async function enroll() {
  if(lock.current)return;lock.current=true;setBusy(true);setMessage('')
  try {
   const {data:existing,error:listError}=await supabase.auth.mfa.listFactors()
   if(listError)throw listError
   const confirmed=existing.all.find(f=>f.factor_type==='totp'&&f.status==='verified')
   if(confirmed){setFactor(confirmed.id);setVerified(true);setQr('');setSecret('');return}
   for(const pending of existing.all.filter(f=>f.factor_type==='totp'&&f.status==='unverified'&&f.friendly_name==='Kumeel administration')) {
    const {error}=await supabase.auth.mfa.unenroll({factorId:pending.id});if(error)throw error
   }
   const {data,error}=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:'Kumeel administration',issuer:'Kumeel Al Nahab'})
   if(error)throw error
   setFactor(data.id);setVerified(false);setQr('');setQrFailed(false);setSecret(data.totp.secret);setCode('')
   try{setQr(await totpQrPng(data.totp.uri))}catch{setQrFailed(true)}
  } catch {setMessage('تعذّر إعداد المصادقة الثنائية. تحقق من الاتصال وإعدادات MFA في Supabase.')}
  finally {lock.current=false;setBusy(false)}
 }
 async function verify(e:FormEvent<HTMLFormElement>) {
  e.preventDefault();if(lock.current||!factor)return
  const normalized=normalizeTotp(code)
  if(!/^\d{6}$/.test(normalized))return
  lock.current=true;setBusy(true);setMessage('')
  try {
   const {error}=await supabase.auth.mfa.challengeAndVerify({factorId:factor,code:normalized})
   if(error)throw error
   setCode('');setQr('');setSecret('');onVerified()
  } catch {setMessage('تعذّر التحقق. استخدم الرمز الحالي من تطبيق المصادقة، ثم حاول مجددًا.')}
  finally {lock.current=false;setBusy(false)}
 }
 return <section className="admin-mfa">{instructions}<span className="section-label">حماية حساب الإدارة</span><h3>خطوة إضافية تحمي أثرَك.</h3><p>أدوات الإدارة تتطلب تأكيد البريد ورمزًا من تطبيق مصادقة، بالإضافة إلى تسجيل الدخول.</p>{!loaded?<p role="status">{message||'جارٍ تحميل إعدادات الحماية…'}</p>:!factor?<button className="primary" disabled={busy} onClick={enroll}>{busy?'جارٍ الإعداد…':'إعداد تطبيق المصادقة'}</button>:<>{secret&&<div className="mfa-setup"><p>امسح الرمز بتطبيق المصادقة، ثم أدخل الرمز المكوّن من ٦ أرقام. احتفظ بنسخة آمنة من مفتاح الإعداد لاستعادة التطبيق؛ لا تشاركه.</p>{qr&&!qrFailed?<img width="220" height="220" src={qr} onError={()=>setQrFailed(true)} alt="رمز إعداد تطبيق المصادقة لحسابك"/>:<p role="status">تعذّر عرض صورة QR. استخدم مفتاح الإعداد اليدوي أدناه.</p>}<p>مفتاح الإعداد اليدوي — أضفه في تطبيق المصادقة واختر رمزًا زمنيًا (TOTP):</p><code dir="ltr">{secret}</code></div>}{!verified&&<button type="button" disabled={busy} onClick={enroll}>إعادة إعداد وعرض رمز QR جديد</button>}{verified&&<p>هذا الحساب مرتبط بتطبيق مصادقة بالفعل. أدخل الرمز من التطبيق الذي أعددته سابقًا.</p>}<form onSubmit={verify}><label htmlFor="mfa-code">رمز تطبيق المصادقة</label><input id="mfa-code" name="code" type="text" dir="ltr" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} value={code} onChange={e=>setCode(normalizeTotp(e.target.value).slice(0,6))} required disabled={busy}/><button className="primary" disabled={busy}>{busy?'جارٍ التحقق…':'تحقق وافتح الإدارة'}</button></form></>}{loaded&&<p role="status">{message}</p>}</section>
}
