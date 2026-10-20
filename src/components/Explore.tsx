import {L} from '../lib/locale-ui'
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
    <L.section id="explore" className="explore-section"><L.div className="wrap section">
      <L.div className="section-heading"><L.div><L.div className="section-label">مساحة للاكتشاف</L.div><L.h2>فضولٌ يقود إلى آفاق جديدة.</L.h2><L.p className="explore-intro">علم نفهمه، وثقافة نحاورها، وتجارب تمنح اليوم معنى.</L.p></L.div><L.a className="text-link" href="#play">جرّب تحدّي المعرفة <L.span aria-hidden="true">←</L.span></L.a></L.div>
      <L.div className="explore-toolbar"><L.div className="tabs" aria-label="تصفية مساحة الاكتشاف">{['الكل', 'علوم', 'ثقافة', 'تجارب', 'المحفوظات'].map(item => <L.button key={item} aria-pressed={category === item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}{item === 'المحفوظات' ? ` (${saved.length})` : ''}</L.button>)}</L.div><L.label className="explore-search"><L.span>ابحث عن فكرة</L.span><L.input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="عنوان أو كلمة تلهمك…" /></L.label></L.div>
      <L.div className="discovery-list">{results.map((a, index) => <L.article className="discovery" key={a.id}><L.span className="discovery-number">{String(index + 1).padStart(2, '0')}</L.span><L.div className="discovery-body"><L.span className="category">{a.category} · {a.time}</L.span><L.button className="discovery-title" aria-expanded={opened === a.id} aria-controls={`article-${a.id}`} onClick={() => setOpened(opened === a.id ? null : a.id)}><L.h3>{a.title}</L.h3><L.span aria-hidden="true">{opened === a.id ? '−' : '+'}</L.span></L.button><L.p>{a.intro}</L.p>{opened === a.id && <L.div id={`article-${a.id}`} className="discovery-text">{a.text.split('\n\n').map(p => <L.p key={p}>{p}</L.p>)}</L.div>}</L.div><L.button className="save-reading" aria-pressed={saved.includes(a.id)} aria-label={`${saved.includes(a.id) ? 'إزالة من المحفوظات' : 'حفظ للمطالعة'}: ${a.title}`} onClick={() => toggleSave(a.id)}>{saved.includes(a.id) ? 'محفوظ ✓' : 'حفظ +'}</L.button></L.article>)}</L.div>
      {results.length === 0 && <L.div className="empty"><L.h3>{category === 'المحفوظات' ? 'مكتبتك تبدأ بفكرة.' : 'لم نجد فكرة بهذه الكلمات.'}</L.h3><L.p>{category === 'المحفوظات' ? 'احفظ ما يلفت انتباهك لتعود إليه هنا.' : 'جرّب كلمة أخرى أو استعرض جميع الموضوعات.'}</L.p><L.button className="text-link" onClick={() => { setSearch(''); setCategory('الكل') }}>استعرض الكل</L.button></L.div>}
      <L.p role="status" className="sample-note">{storageNotice || 'نصوص تمهيدية للمنصة · محفوظات القراءة خاصة بهذا المتصفح.'}</L.p>
    </L.div></L.section>
    <L.section id="play" className="knowledge wrap section"><L.div className="knowledge-copy"><L.div className="section-label">استراحة ممتعة</L.div><L.h2>اختبر فضولك،<L.br />وتعلّم شيئًا جديدًا.</L.h2><L.p>{questions.length} أسئلة قصيرة. لا سباق مع الوقت؛ المتعة في اكتشاف الإجابة.</L.p><L.a className="text-link" href="#observatory">أو تأمل فكرة في المرصد <L.span aria-hidden="true">←</L.span></L.a></L.div><L.div className="quiz-panel">
      {questions.length === 0 ? <L.div className="empty"><L.h3>التحدّي ينتظر أسئلته الأولى.</L.h3></L.div> : question ? <><L.div className="quiz-progress"><L.span>السؤال {step + 1} من {questions.length}</L.span><L.span>{score} إجابات صحيحة</L.span></L.div><L.h3>{question.title}</L.h3><L.div className="quiz-options">{question.options.map((option, i) => <L.button key={option} disabled={choice !== null} className={choice !== null && i === question.answer ? 'correct' : choice === i ? 'incorrect' : ''} onClick={() => { setChoice(i); if (i === question.answer) setScore(score + 1) }}>{option}</L.button>)}</L.div>{choice !== null && <L.div className="quiz-feedback" role="status"><L.strong>{choice === question.answer ? 'أحسنت!' : 'فرصة لاكتشاف فكرة جديدة.'}</L.strong><L.p>{question.why}</L.p><L.button className="primary" onClick={() => { setStep(step + 1); setChoice(null) }}>{step === questions.length - 1 ? 'عرض النتيجة' : 'السؤال التالي'}</L.button></L.div>}</> : <L.div className="quiz-result" role="status"><L.span className="quiz-score">{score} / {questions.length}</L.span><L.h3>{score === questions.length ? 'فضولك في مكانه!' : 'كل سؤال يفتح بابًا.'}</L.h3><L.p>يمكنك العودة إلى مساحة الاكتشاف أو تجربة التحدّي مجددًا.</L.p><L.button className="primary" onClick={() => { setStep(0); setChoice(null); setScore(0) }}>جرّب مرة أخرى</L.button></L.div>}
    </L.div></L.section>
  </>
}
