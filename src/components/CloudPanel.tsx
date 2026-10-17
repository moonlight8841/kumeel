import { LoginForm } from './LoginForm'
import {PasswordResetForm} from './PasswordResetForm'
import { AdminMfa } from './AdminMfa'
import authConfig from '../auth-config.json'
import { useEffect, useState } from 'react'
import type { OwnerDraft as Content } from '../lib/translations'
import { supabase, isEditor, loadCloudDraft, saveCloudDraft, publishContent, uploadMedia } from '../lib/cloud'

type Props = { content: Content; revision: number | null; onLoad: (content: Content) => boolean; onPublish: (content: Content, revision: number) => void; onAuthorizationChange: (authorized: boolean,ownerId?:string|null) => void; hasUnsavedChanges?:boolean;hasLocalDraft?:boolean }
export function CloudPanel({ content, revision, onLoad, onPublish, onAuthorizationChange,hasUnsavedChanges=false,hasLocalDraft=false }: Props) {
  const [userId, setUserId] = useState<string | null>(null)
  const [recovering,setRecovering]=useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [member, setMember] = useState(false)
  const [verifiedEmail, setVerifiedEmail] = useState(false)
  const [checking, setChecking] = useState(false)
  const [authVersion, setAuthVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [optionalMfa,setOptionalMfa]=useState(false)
  const [confirmPublish, setConfirmPublish] = useState(false)
  useEffect(() => {
    let current = true
    let identity:string|null=null
    if(new URLSearchParams(window.location.search).get('reset')==='1')setRecovering(true)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!current) return
      if(_event==='PASSWORD_RECOVERY')setRecovering(true)
      if (_event === 'SIGNED_IN' && session) { setSessionExpired(false); try { localStorage.setItem(`kumeel-idle-${session.user.id}`, String(Date.now())) } catch { /* Optional idle persistence. */ } }
      setUserId(session?.user.id ?? null); setAuthVersion(v => v + 1); setChecking(Boolean(session)); setConfirmPublish(false)
      setAuthorized(false); setMember(false); setVerifiedEmail(false)
      const nextIdentity=session?.user.id??null
      onAuthorizationChange(false,nextIdentity!==identity||!nextIdentity?null:undefined);identity=nextIdentity
    })
    return () => { current = false; subscription.unsubscribe() }
  }, [onAuthorizationChange])
  useEffect(() => {
    let current = true
    if (userId) void (async()=>{
      const {data:user,error:userError}=await supabase.auth.getUser()
      if(userError||user.user?.id!==userId)throw new Error('تعذّر التحقق من جلسة الحساب. أعد تسجيل الدخول.')
      const confirmed=Boolean(user.user.email_confirmed_at)
      const ok=confirmed&&await isEditor(userId)
      let mfaSatisfied = !authConfig.requireAdminMfa
      if (authConfig.requireAdminMfa && ok) {
        const {data:assurance,error}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if(error)throw new Error('تعذّر التحقق من مستوى حماية الجلسة.')
        mfaSatisfied=assurance.currentLevel==='aal2'
      }
      const secure=!recovering&&!sessionExpired&&ok&&mfaSatisfied
      if(current){setVerifiedEmail(confirmed);setMember(ok&&!sessionExpired);setAuthorized(secure);onAuthorizationChange(secure,secure?userId:null);setChecking(false)}
    })().catch(error=>{if(current){setChecking(false);setMessage(error instanceof Error?error.message:'تعذّر التحقق من صلاحيات الحساب.')}})
    return () => { current = false }
  }, [userId, authVersion, sessionExpired, recovering, onAuthorizationChange])
  useEffect(()=>{
    if(!userId)return
    const storageKey=`kumeel-idle-${userId}`
    let last=Date.now()
    try { const saved=Number(localStorage.getItem(storageKey));if(saved>0)last=saved } catch { /* Memory-only fallback. */ }
    const activity=()=>{last=Date.now();try{localStorage.setItem(storageKey,String(last))}catch{/* Memory-only fallback. */}}
    const events=['pointerdown','keydown'] as const
    let expired=false
    const check=()=>{try{const shared=Number(localStorage.getItem(storageKey));if(shared>last&&shared<=Date.now())last=shared}catch{/* Memory-only fallback. */}if(!expired&&Date.now()-last>=15*60*1000){expired=true;setSessionExpired(true);setAuthorized(false);setMember(false);onAuthorizationChange(false,null);void supabase.auth.signOut({scope:'local'}).then(({error})=>{setMessage(error?'انتهت مهلة الخمول. أعد تسجيل الدخول بعد استعادة الاتصال.':'أُغلقت جلسة الإدارة بعد ١٥ دقيقة من الخمول.');try{localStorage.removeItem(storageKey)}catch{/* Optional cleanup. */}})}}
    check()
    events.forEach(event=>window.addEventListener(event,activity))
    const timer=setInterval(check,10000)
    return()=>{clearInterval(timer);events.forEach(event=>window.removeEventListener(event,activity))}
  },[userId,onAuthorizationChange])
  async function run(task: () => Promise<void>) {
    setBusy(true); setMessage('')
    try { await task() } catch (error) { setMessage(error instanceof Error ? error.message : 'تعذّرت العملية. تحقق من الاتصال والصلاحيات ثم أعد المحاولة.') } finally { setBusy(false) }
  }
  if(recovering&&userId)return <PasswordResetForm onDone={()=>{setRecovering(false);setMessage('حُفظت كلمة المرور الجديدة. سجّل الدخول بها الآن.')}}/>
  return <section className={userId ? "cloud-panel" : "login-panel"}>{userId && <><a className="text-link" href="/member">مساحة العضو ومساهماتي ←</a><h3>النشر السحابي</h3><p>حساب المالك يحفظ مسودات خاصة وينشر نسخة عامة للموقع.</p></>}
    {!userId ? <LoginForm /> : <>
      <p>{checking ? 'جارٍ التحقق من صلاحيات الحساب…' : authorized ? (authConfig.requireAdminMfa ? 'حساب مخوّل بالنشر · مصادقة ثنائية مؤكدة' : 'حساب مخوّل بالنشر · بريد مؤكّد') : !verifiedEmail ? 'أكّد بريدك الإلكتروني قبل المتابعة.' : member ? 'أكمل المصادقة الثنائية لفتح أدوات الإدارة.' : 'حساب قارئ · لا يملك صلاحيات الإدارة.'}</p>
      {authConfig.requireAdminMfa && member && !authorized && !checking && <AdminMfa key={userId} onVerified={()=>{setChecking(true);setAuthVersion(v=>v+1)}}/>}
      {authorized&&!authConfig.requireAdminMfa&&<><button disabled={busy||checking} onClick={()=>setOptionalMfa(v=>!v)}>{optionalMfa?'إغلاق إعداد التحقق الإضافي':'التحقق بتطبيق المصادقة (اختياري)'}</button>{optionalMfa&&<AdminMfa optional onVerified={()=>{setOptionalMfa(false);setAuthVersion(v=>v+1)}}/>}</>}
      <button disabled={busy||checking} onClick={()=>{setAuthorized(false);onAuthorizationChange(false,null);setRecovering(true)}}>تغيير كلمة المرور</button>
      <button disabled={busy} onClick={() => void run(async () => { if(hasLocalDraft&&!window.confirm('ستُمسح مسودة هذا التبويب عند الخروج. احفظها سحابيًا أو صدّرها أولًا. هل تريد الخروج؟'))return;const { error } = await supabase.auth.signOut({scope:'local'}); if (error) throw error })}>تسجيل الخروج</button>
      <button disabled={busy} onClick={() => void run(async () => { if(hasLocalDraft&&!window.confirm('ستُمسح مسودة هذا التبويب وتُلغى جلسات الأجهزة الأخرى. احفظ مسودتك سحابيًا أولًا. هل تريد المتابعة؟'))return;const {error}=await supabase.auth.signOut({scope:'global'});if(error)throw error })}>تسجيل الخروج من جميع الأجهزة</button>
      {!authorized && !checking && <button disabled={busy} onClick={() => { setChecking(true); setAuthVersion(v => v + 1) }}>إعادة التحقق من الصلاحية</button>}
      {authorized && <><div className="cloud-actions"><button disabled={busy} onClick={() => void run(async () => { await saveCloudDraft(userId, content); setMessage('حُفظت مسودتك الخاصة في Supabase.') })}>حفظ مسودة سحابية</button><button disabled={busy} onClick={() => void run(async () => { if (!onLoad(await loadCloudDraft(userId))) throw new Error('تعذّر حفظ المسودة المحمّلة محليًا.'); setMessage('تم تحميل المسودة السحابية إلى الدفتر.') })}>تحميل المسودة السحابية</button></div>
      <label>رفع صورة أو فيديو إلى المكتبة<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (!file) return; e.target.value = ''; void run(async () => { const url = await uploadMedia(file); const saved = onLoad({ ...content, media: [...content.media, { id: crypto.randomUUID(), title: file.name.replace(/\.[^.]+$/, ''), type: file.type.startsWith('video/') ? 'فيديو' : 'صورة', url }] }); if (!saved) throw new Error('رُفع الملف لكن تعذّر حفظه في المسودة المحلية.'); setMessage('رُفع الملف وأُضيف إلى المسودة. انشر المسودة ليظهر في المعرض.') }) }} /></label><p className="sample-note">حتى ٥٠ ميغابايت. الملفات المرفوعة لها روابط عامة؛ المسودات النصية خاصة بحسابك.</p>
      <button className="primary" disabled={busy || revision === null || hasUnsavedChanges} onClick={() => setConfirmPublish(true)}>نشر النسخة الحالية</button>
      {hasUnsavedChanges&&<p role="status" className="sample-note">لديك تحرير في الدفتر لم يُحفظ. احفظه أو تجاهله من محرر الدفتر قبل النشر العام.</p>}
      {confirmPublish && <div className="publish-confirm"><p>ستصبح النبذة و{content.writings.length} نصوص و{content.media.length} ملفات و{content.ideas?.length ?? 0} أفكار و{content.sessions?.length ?? 0} مواعيد وروابط لقاءات متاحة لجميع الزوار. تأكد من حفظ حقول التحرير ومراجعة المصادر أولًا.</p><button disabled={busy} onClick={() => setConfirmPublish(false)}>إلغاء</button><button className="primary" disabled={busy||hasUnsavedChanges} onClick={() => void run(async () => { if(hasUnsavedChanges)throw new Error("Save notebook changes before publishing"); if (revision === null) throw new Error('أعد تحميل الصفحة للتحقق من النسخة المنشورة.'); if(content.translationDrafts)await saveCloudDraft(userId, content); const result = await publishContent(content, revision); onPublish(result.content, result.revision); setConfirmPublish(false); setMessage('نُشر المحتوى بنجاح. تحديث نتائج محركات البحث يعتمد على إعادة الزحف والفهرسة، ولا يحدث فور النشر بالضرورة.') })}>تأكيد النشر العام</button></div>}
      </>}
    </>}
    <p role="status">{busy ? 'جارٍ تنفيذ العملية…' : message}</p>
  </section>
}
