import { useEffect, useState } from 'react'
import type { Content } from '../content'
import { defaultDiscoveries, defaultQuiz } from '../learning'

export function Explore({ content }: { content: Content }) {
  const articles = content.discoveries ?? defaultDiscoveries
  const questions = content.quiz ?? defaultQuiz
  const [category, setCategory] = useState('الكل')
  const [search, setSearch] = useState('')
  const [saved, setSaved] = useState<string[]>([])
  const [storageNotice, setStorageNotice] = useState('')
  const [opened, setOpened] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [choice, setChoice] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  useEffect(() => {
    try { const value: unknown = JSON.parse(localStorage.getItem('kumeel-reading-list') || '[]'); if (Array.isArray(value)) setSaved(value.filter((id): id is string => typeof id === 'string' && articles.some(a => a.id === id))) } catch { setStorageNotice('تعذّر استعادة قائمة القراءة.') }
  }, [articles])
  function toggleSave(id: string) {
    const next = saved.includes(id) ? saved.filter(item => item !== id) : [...saved, id]
    setSaved(next)
    try { localStorage.setItem('kumeel-reading-list', JSON.stringify(next)); setStorageNotice('حُدّثت قائمة القراءة على هذا المتصفح.') } catch { setStorageNotice('القائمة متاحة لهذه الزيارة؛ تعذّر حفظها على المتصفح.') }
  }
  const results = articles.filter(a => (category === 'الكل' || category === a.category || (category === 'المحفوظات' && saved.includes(a.id))) && `${a.title} ${a.intro} ${a.text}`.includes(search.trim()))
  const question = questions[step]
  return <>
    <section id="explore" className="explore-section"><div className="wrap section">
      <div className="section-heading"><div><div className="section-label">مساحة للاكتشاف</div><h2>فضولٌ يقود إلى آفاق جديدة.</h2><p className="explore-intro">علم نفهمه، وثقافة نحاورها، وتجارب تمنح اليوم معنى.</p></div><a className="text-link" href="#play">جرّب تحدّي المعرفة <span aria-hidden="true">←</span></a></div>
      <div className="explore-toolbar"><div className="tabs" aria-label="تصفية مساحة الاكتشاف">{['الكل', 'علوم', 'ثقافة', 'تجارب', 'المحفوظات'].map(item => <button key={item} aria-pressed={category === item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}{item === 'المحفوظات' ? ` (${saved.length})` : ''}</button>)}</div><label className="explore-search"><span>ابحث عن فكرة</span><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="عنوان أو كلمة تلهمك…" /></label></div>
      <div className="discovery-list">{results.map((a, index) => <article className="discovery" key={a.id}><span className="discovery-number">{String(index + 1).padStart(2, '0')}</span><div className="discovery-body"><span className="category">{a.category} · {a.time}</span><button className="discovery-title" aria-expanded={opened === a.id} aria-controls={`article-${a.id}`} onClick={() => setOpened(opened === a.id ? null : a.id)}><h3>{a.title}</h3><span aria-hidden="true">{opened === a.id ? '−' : '+'}</span></button><p>{a.intro}</p>{opened === a.id && <div id={`article-${a.id}`} className="discovery-text">{a.text.split('\n\n').map(p => <p key={p}>{p}</p>)}</div>}</div><button className="save-reading" aria-pressed={saved.includes(a.id)} aria-label={`${saved.includes(a.id) ? 'إزالة من المحفوظات' : 'حفظ للمطالعة'}: ${a.title}`} onClick={() => toggleSave(a.id)}>{saved.includes(a.id) ? 'محفوظ ✓' : 'حفظ +'}</button></article>)}</div>
      {results.length === 0 && <div className="empty"><h3>{category === 'المحفوظات' ? 'مكتبتك تبدأ بفكرة.' : 'لم نجد فكرة بهذه الكلمات.'}</h3><p>{category === 'المحفوظات' ? 'احفظ ما يلفت انتباهك لتعود إليه هنا.' : 'جرّب كلمة أخرى أو استعرض جميع الموضوعات.'}</p><button className="text-link" onClick={() => { setSearch(''); setCategory('الكل') }}>استعرض الكل</button></div>}
      <p role="status" className="sample-note">{storageNotice || 'نصوص تمهيدية للمنصة · محفوظات القراءة خاصة بهذا المتصفح.'}</p>
    </div></section>
    <section id="play" className="knowledge wrap section"><div className="knowledge-copy"><div className="section-label">استراحة ممتعة</div><h2>اختبر فضولك،<br />وتعلّم شيئًا جديدًا.</h2><p>{questions.length} أسئلة قصيرة. لا سباق مع الوقت؛ المتعة في اكتشاف الإجابة.</p><a className="text-link" href="#observatory">أو تأمل فكرة في المرصد <span aria-hidden="true">←</span></a></div><div className="quiz-panel">
      {questions.length === 0 ? <div className="empty"><h3>التحدّي ينتظر أسئلته الأولى.</h3></div> : question ? <><div className="quiz-progress"><span>السؤال {step + 1} من {questions.length}</span><span>{score} إجابات صحيحة</span></div><h3>{question.title}</h3><div className="quiz-options">{question.options.map((option, i) => <button key={option} disabled={choice !== null} className={choice !== null && i === question.answer ? 'correct' : choice === i ? 'incorrect' : ''} onClick={() => { setChoice(i); if (i === question.answer) setScore(score + 1) }}>{option}</button>)}</div>{choice !== null && <div className="quiz-feedback" role="status"><strong>{choice === question.answer ? 'أحسنت!' : 'فرصة لاكتشاف فكرة جديدة.'}</strong><p>{question.why}</p><button className="primary" onClick={() => { setStep(step + 1); setChoice(null) }}>{step === questions.length - 1 ? 'عرض النتيجة' : 'السؤال التالي'}</button></div>}</> : <div className="quiz-result" role="status"><span className="quiz-score">{score} / {questions.length}</span><h3>{score === questions.length ? 'فضولك في مكانه!' : 'كل سؤال يفتح بابًا.'}</h3><p>يمكنك العودة إلى مساحة الاكتشاف أو تجربة التحدّي مجددًا.</p><button className="primary" onClick={() => { setStep(0); setChoice(null); setScore(0) }}>جرّب مرة أخرى</button></div>}
    </div></section>
  </>
}
