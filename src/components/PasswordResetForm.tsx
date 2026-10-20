import {L} from '../lib/locale-ui'
import {useState,type FormEvent} from 'react'
import {supabase} from '../lib/cloud'
import {MIN_PASSWORD_LENGTH,validNewPassword} from '../lib/auth-security'

export function PasswordResetForm({onDone}:{onDone:()=>void}){
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return
  const form=event.currentTarget
  const fields=new FormData(form)
  const password=String(fields.get('password')??'')
  if(!validNewPassword(password)||password!==fields.get('confirm')){setMessage('استخدم عبارة من ١٤ إلى ١٢٨ حرفًا، وأعد كتابتها كما هي.');return}
  setBusy(true);setMessage('')
  try{
   const {data,error:sessionError}=await supabase.auth.getUser()
   if(sessionError||!data.user)throw new Error('انتهى رابط الاستعادة. اطلب رسالة جديدة وافتحها في المتصفح الذي طلبتها منه.')
   const {error}=await supabase.auth.updateUser({password})
   if(error)throw new Error(error.code==='same_password'?'اختر كلمة مرور جديدة تختلف عن السابقة.':'تعذّر حفظ كلمة المرور. قد تحتاج إلى رابط استعادة جديد.')
   form.reset()
   const {error:signOutError}=await supabase.auth.signOut({scope:'local'})
   if(signOutError){setMessage('حُفظت كلمة المرور. أعد تحميل الصفحة ثم سجّل الدخول بالكلمة الجديدة.');return}
   history.replaceState(null,'',location.pathname)
   onDone()
  }catch(error){setMessage(error instanceof Error?error.message:'تعذّر إكمال الاستعادة.')}
  finally{setBusy(false)}
 }
 return <L.section className="login-card"><L.h2>تعيين كلمة مرور جديدة</L.h2><L.p>اختر عبارة طويلة وفريدة لا تستخدمها في حساب آخر.</L.p><L.form onSubmit={submit} aria-busy={busy}><L.label htmlFor="recovery-password">كلمة المرور الجديدة</L.label><L.input id="recovery-password" name="password" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} maxLength={128} disabled={busy}/><L.label htmlFor="recovery-confirm">تأكيد كلمة المرور</L.label><L.input id="recovery-confirm" name="confirm" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} maxLength={128} disabled={busy}/><L.button className="primary" disabled={busy}>{busy?'جارٍ الحفظ…':'حفظ كلمة المرور الجديدة'}</L.button><L.p role="status">{message}</L.p></L.form></L.section>
}
