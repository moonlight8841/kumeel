import { useEffect, useState, type FormEvent } from 'react'
import type { Content } from '../content'
import { supabase, isEditor, loadCloudDraft, saveCloudDraft, publishContent, uploadMedia } from '../lib/cloud'

type Props = { content: Content; revision: number | null; onLoad: (content: Content) => boolean; onPublish: (content: Content, revision: number) => void; onAuthorizationChange: (authorized: boolean) => void }
export function CloudPanel({ content, revision, onLoad, onPublish, onAuthorizationChange }: Props) {
  const [userId, setUserId] = useState<string | null>(null)
  const [authorized, setAuthorized] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmPublish, setConfirmPublish] = useState(false)
  useEffect(() => {
    let current = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!current) return
      setUserId(session?.user.id ?? null)
      setAuthorized(false); onAuthorizationChange(false)
    })
    return () => { current = false; subscription.unsubscribe() }
  }, [onAuthorizationChange])
  useEffect(() => {
    let current = true
    if (userId) isEditor(userId).then(ok => { if (current) { setAuthorized(ok); onAuthorizationChange(ok) } }).catch(() => { if (current) setMessage('تعذّر التحقق من صلاحية النشر.') })
    return () => { current = false }
  }, [userId, onAuthorizationChange])
  async function run(task: () => Promise<void>) {
    setBusy(true); setMessage('')
    try { await task() } catch (error) { setMessage(error instanceof Error ? error.message : 'تعذّرت العملية. تحقق من الاتصال والصلاحيات ثم أعد المحاولة.') } finally { setBusy(false) }
  }
  function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    void run(async () => {
      const { error } = await supabase.auth.signInWithPassword({ email: String(data.get('email')), password: String(data.get('password')) })
      if (error) throw new Error('تعذّر تسجيل الدخول. تحقق من البريد وكلمة المرور.')
      setMessage('تم تسجيل الدخول.')
    })
  }
  return <section className="cloud-panel"><h3>النشر السحابي</h3><p>حساب المالك يحفظ مسودات خاصة وينشر نسخة عامة للموقع.</p>
    {!userId ? <form onSubmit={login}><label>البريد الإلكتروني<input defaultValue="kumeelalnahab@gmail.com" type="email" name="email" autoComplete="username" required /></label><button type="button" disabled={busy} onClick={e => { const form=e.currentTarget.closest('form'); if(!form)return; const email=String(new FormData(form).get('email')); if(!form.querySelector<HTMLInputElement>('input[type=email]')?.reportValidity())return; void run(async()=>{const {error}=await supabase.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:window.location.origin+'/admin'}});if(error)throw new Error('تعذّر إرسال رابط الدخول. تحقق من إعدادات الاتصال والبريد.');setMessage('راجع بريدك لفتح رابط الدخول. الحساب يحتاج تفويض المالك قبل إدارة الموقع.')}) }}>أرسل رابط دخول إلى بريدي</button><label>كلمة المرور<input type="password" name="password" autoComplete="current-password" required /></label><button className="primary" disabled={busy}>دخول المالك</button></form> : <>
      <p>{authorized ? 'حساب مخوّل بالنشر' : 'هذا الحساب غير مخوّل بالنشر.'}</p>
      <button disabled={busy} onClick={() => void run(async () => { const { error } = await supabase.auth.signOut(); if (error) throw error })}>تسجيل الخروج</button>
      {authorized && <><div className="cloud-actions"><button disabled={busy} onClick={() => void run(async () => { await saveCloudDraft(userId, content); setMessage('حُفظت مسودتك الخاصة في Supabase.') })}>حفظ مسودة سحابية</button><button disabled={busy} onClick={() => void run(async () => { if (!onLoad(await loadCloudDraft(userId))) throw new Error('تعذّر حفظ المسودة المحمّلة محليًا.'); setMessage('تم تحميل المسودة السحابية إلى الدفتر.') })}>تحميل المسودة السحابية</button></div>
      <label>رفع صورة أو فيديو إلى المكتبة<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (!file) return; e.target.value = ''; void run(async () => { const url = await uploadMedia(file); const saved = onLoad({ ...content, media: [...content.media, { id: crypto.randomUUID(), title: file.name.replace(/\.[^.]+$/, ''), type: file.type.startsWith('video/') ? 'فيديو' : 'صورة', url }] }); if (!saved) throw new Error('رُفع الملف لكن تعذّر حفظه في المسودة المحلية.'); setMessage('رُفع الملف وأُضيف إلى المسودة. انشر المسودة ليظهر في المعرض.') }) }} /></label><p className="sample-note">حتى ٥٠ ميغابايت. الملفات المرفوعة لها روابط عامة؛ المسودات النصية خاصة بحسابك.</p>
      <button className="primary" disabled={busy || revision === null} onClick={() => setConfirmPublish(true)}>نشر النسخة الحالية</button>
      {confirmPublish && <div className="publish-confirm"><p>ستصبح النبذة و{content.writings.length} نصوص و{content.media.length} ملفات و{content.ideas?.length ?? 0} أفكار و{content.sessions?.length ?? 0} مواعيد وروابط لقاءات متاحة لجميع الزوار. تأكد من حفظ حقول التحرير ومراجعة المصادر أولًا.</p><button disabled={busy} onClick={() => setConfirmPublish(false)}>إلغاء</button><button className="primary" disabled={busy} onClick={() => void run(async () => { if (revision === null) throw new Error('أعد تحميل الصفحة للتحقق من النسخة المنشورة.'); const result = await publishContent(content, revision); onPublish(result.content, result.revision); setConfirmPublish(false); setMessage('نُشر المحتوى بنجاح. تحديث نتائج محركات البحث يعتمد على إعادة الزحف والفهرسة، ولا يحدث فور النشر بالضرورة.') })}>تأكيد النشر العام</button></div>}
      </>}
    </>}
    <p role="status">{busy ? 'جارٍ تنفيذ العملية…' : message}</p>
  </section>
}
