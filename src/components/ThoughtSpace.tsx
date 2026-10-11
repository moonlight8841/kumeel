import { useEffect, useState, type FormEvent } from 'react'
import { initialContent, type Content, type Session } from '../content'
import { downloadCalendar } from '../lib/calendar'

export function ThoughtSpace({ content, section = 'all' }: { content: Content; section?: 'all' | 'observatory' | 'salon' }) {
  const [filter, setFilter] = useState('الكل')
  const [lab, setLab] = useState({ claim: '', alternative: '', evidence: '' })
  const [message, setMessage] = useState('')
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 60000)
    try { const saved = JSON.parse(localStorage.getItem('kumeel-thought-lab') || 'null'); if (saved && ['claim', 'alternative', 'evidence'].every(key => typeof saved[key] === 'string')) setLab(saved) } catch { setMessage('تعذّر استعادة تمرينك السابق.') }
    return () => clearInterval(timer)
  }, [])
  function saveLab(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    try { localStorage.setItem('kumeel-thought-lab', JSON.stringify(lab)); setMessage('حُفظ تمرينك على هذا المتصفح. يمكنك العودة إليه وتعديل إجاباتك.') } catch { setMessage('تعذّر حفظ التمرين. احتفظ بإجاباتك قبل مغادرة الصفحة.') }
  }
  const ideas = content.ideas ?? initialContent.ideas ?? []
  const media = content.media.filter(m => m.purpose && m.description?.trim())
  const sessions = [...(content.sessions ?? [])].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
  const sessionEnded = (s: Session) => now !== null && now > Date.parse(s.startsAt) + s.durationMinutes * 60000
  return <>
    {section !== 'salon' && <section id="observatory" className="observatory wrap section">
      <div className="section-heading"><div><div className="section-label">مرصد الأفكار</div><h2>فكرة تستحق أن نختلف حولها.</h2><p className="explore-intro">حكمة نختبرها، ودرس نفهمه، وسؤال يبقى مفتوحًا.</p></div><a className="text-link" href="/observatory">المرصد كاملًا <span aria-hidden="true">↗</span></a></div>
      <div className="tabs thought-tabs" aria-label="تصفية الأفكار">{['الكل', 'حكمة', 'درس', 'تجربة فكرية'].map(kind => <button key={kind} aria-pressed={filter === kind} className={filter === kind ? 'active' : ''} onClick={() => setFilter(kind)}>{kind}</button>)}</div>
      <div className="thought-list">{ideas.filter(i => filter === 'الكل' || filter === i.kind).map(idea => <article className={`thought-item ${idea.kind === 'حكمة' ? 'thought-wisdom' : ''}`} key={idea.id}><div className="thought-meta"><span>{idea.kind}</span>{idea.sample && <small>نموذج تحريري · غير منسوب إلى كميل</small>}</div><h3><a href={`/ideas/${encodeURIComponent(idea.id)}`}>{idea.title}</a></h3><p>{idea.text.split('\n\n')[0]}</p><div className="thought-question"><span>سؤال للتأمل</span><p>{idea.question}</p></div><a className="text-link" href={`/ideas/${encodeURIComponent(idea.id)}`}>افتح الفكرة واعتراضها <span aria-hidden="true">←</span></a></article>)}</div>
      {!ideas.some(i => filter === 'الكل' || filter === i.kind) && <div className="empty"><h3>هذه المساحة تنتظر فكرتها الأولى.</h3><p>تُضاف الأفكار من دفتر التحرير.</p></div>}
      <div className="visual-lessons"><div className="section-heading"><div><h3>حكمة تُرى، وفكرة تُشرح.</h3><p className="explore-intro">كل صورة تحمل معنى، وكل فيديو يفتح بابًا للفهم.</p></div></div>{media.length ? <div className="lesson-list">{media.map(item => <article className="lesson-item" key={item.id}><a href={`/media/${encodeURIComponent(item.id)}`}>{item.type === 'صورة' ? <img src={item.url} alt={item.description || item.title} loading="lazy" /> : <div className="lesson-video-preview">{item.thumbnail && <img src={item.thumbnail} alt="" loading="lazy" />}<span aria-hidden="true">▷</span><span>افتح الدرس المرئي</span></div>}<span className="category">{item.purpose}</span><h3>{item.title}</h3></a><p>{item.description}</p>{item.source && <small>المصدر: {item.source}</small>}</article>)}</div> : <div className="media-empty"><h3>المعنى قبل الصورة.</h3><p>ستظهر هنا بطاقات الحكمة والدروس المرئية بعد إضافتها مع وصفها ومصدرها من دفتر التحرير.</p></div>}</div>
      <div className="assumption-lab"><div><div className="section-label">مختبر الافتراضات</div><h2>اختبر فكرةً<br />قبل أن تدافع عنها.</h2><p>تمرين خاص بك: اكتب قناعتك، ثم أنصف اعتراضها، وحدّد الدليل الذي يمكن أن يغيّرها.</p><small>إجاباتك تبقى على هذا المتصفح ولا تُنشر للآخرين.</small></div><form onSubmit={saveLab}>{[{ key: 'claim' as const, label: '١. ما الفكرة التي تؤمن بها؟', placeholder: 'اكتب ادعاءً محددًا يمكن مناقشته.' }, { key: 'alternative' as const, label: '٢. ما أقوى اعتراض عليها؟', placeholder: 'حاول أن تنصف الرأي الآخر.' }, { key: 'evidence' as const, label: '٣. ما الدليل الذي قد يغيّر رأيك؟', placeholder: 'حدّد ما تحتاج إلى رؤيته أو اختباره.' }].map(field => <label key={field.key}>{field.label}<textarea required maxLength={3000} value={lab[field.key]} placeholder={field.placeholder} onChange={e => setLab({ ...lab, [field.key]: e.target.value })} /></label>)}<button className="primary">حفظ تمريني</button><p role="status" className="lab-status">{message}</p></form></div>
    </section>}
    {section !== 'observatory' && <section id="salon" className="salon-section"><div className="wrap section"><div className="section-heading"><div><div className="section-label">مجلس الحوار</div><h2>سؤال واحد.<br />وأكثر من زاوية للنظر.</h2><p className="explore-intro">لقاء مع كميل ال نهاب، نبدأ فيه بفكرة ونمنح الاعتراض مكانه.</p></div><a className="text-link" href="/salon">صفحة المجلس <span aria-hidden="true">↗</span></a></div><div className="salon-format"><p><b>١٠ دقائق</b><span>لتقديم الفكرة</span></p><p><b>٢٠ دقيقة</b><span>للأسئلة والاعتراضات</span></p><p><b>١٠ دقائق</b><span>لما تعلّمناه معًا</span></p></div>
      {sessions.length ? <div className="session-list">{sessions.map(s => <article className="session-item" key={s.id}><div className="category">{s.cancelled ? 'موعد ملغى' : sessionEnded(s) ? 'انتهى الموعد المعلن' : 'موعد معلن'} · {new URL(s.joinUrl).hostname === 'meet.google.com' ? 'Google Meet' : 'YouTube'}</div><h3>{s.title}</h3><p>{s.question}</p><time dateTime={s.startsAt}>{new Intl.DateTimeFormat('ar-SA', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Riyadh', calendar: 'gregory' }).format(new Date(s.startsAt))} · توقيت الرياض</time>{s.notes && <p>{s.notes}</p>}<div className="session-actions">{!s.cancelled && !sessionEnded(s) && <><a className="primary" href={s.joinUrl} target="_blank" rel="noopener noreferrer">افتح منصة اللقاء <span aria-hidden="true">↗</span></a><button className="text-link" onClick={() => downloadCalendar(s)}>أضف الموعد إلى تقويمك</button></>}{!s.cancelled && sessionEnded(s) && <p className="sample-note">لا يعني انتهاء الموعد توفر تسجيل. تُضاف التسجيلات المعتمدة إلى الدروس المرئية.</p>}</div></article>)}</div> : <div className="salon-empty"><h3>المجلس يبدأ حين يستحق السؤال.</h3><p>لم يُعلن موعد بعد. سيظهر رابط اللقاء وموعده هنا بعد إعداد الجلسة.</p></div>}
      <div className="dialogue-principles"><p>نناقش الفكرة باحترام.</p><p>نطلب الدليل ونذكر المصدر.</p><p>نغادر بسؤال أفضل.</p></div><p className="sample-note">اللقاءات عبر Google Meet أو YouTube. يظل قبول المشاركين وإدارة اللقاء بيد المضيف على منصة اللقاء.</p>
    </div></section>}
  </>
}
