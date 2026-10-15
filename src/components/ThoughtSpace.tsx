import { useState } from 'react'
import { type Content, type Idea } from '../content'
import {Salon} from './Salon'
import {AssumptionLab} from './AssumptionLab'
import {MindPlay} from './MindPlay'

export function ThoughtSpace({ content, section = 'all' }: { content: Content; section?: 'all' | 'observatory' | 'salon' }) {
  const [filter, setFilter] = useState('الكل')
  const [practice,setPractice]=useState<Idea|null>(null)
  const ideas = content.ideas ?? []
  const media = content.media.filter(m => m.purpose && m.description?.trim())
  return <>
    {section !== 'salon' && <section id="observatory" className="observatory wrap section">
      <div className="section-heading"><div><div className="section-label">مرصد الأفكار</div><h2>فكرة تستحق أن نختلف حولها.</h2><p className="explore-intro">حكمة نختبرها، ودرس نفهمه، وسؤال يبقى مفتوحًا.</p></div><a className="text-link" href="/observatory">المرصد كاملًا <span aria-hidden="true">↗</span></a></div>
      <div className="tabs thought-tabs" aria-label="تصفية الأفكار">{['الكل', 'حكمة', 'درس', 'تجربة فكرية'].map(kind => <button key={kind} aria-pressed={filter === kind} className={filter === kind ? 'active' : ''} onClick={() => setFilter(kind)}>{kind}</button>)}</div>
      <MindPlay ideas={ideas} content={content} onPractice={idea=>setPractice({...idea})}/>
      <div className="thought-list">{ideas.filter(i => filter === 'الكل' || filter === i.kind).map(idea => <article className={`thought-item ${idea.kind === 'حكمة' ? 'thought-wisdom' : ''}`} key={idea.id}><div className="thought-meta"><span>{idea.kind}</span>{idea.sample && <small>نموذج تحريري · غير منسوب إلى كميل</small>}</div><h3><a href={`/ideas/${encodeURIComponent(idea.id)}`}>{idea.title}</a></h3><p>{idea.text.split('\n\n')[0]}</p><div className="thought-question"><span>سؤال للتأمل</span><p>{idea.question}</p></div><a className="text-link" href={`/ideas/${encodeURIComponent(idea.id)}`}>افتح الفكرة واعتراضها <span aria-hidden="true">←</span></a></article>)}</div>
      {!ideas.some(i => filter === 'الكل' || filter === i.kind) && <div className="empty"><h3>هذه المساحة تنتظر فكرتها الأولى.</h3><p>تُضاف الأفكار من دفتر التحرير.</p></div>}
      <div className="visual-lessons"><div className="section-heading"><div><h3>حكمة تُرى، وفكرة تُشرح.</h3><p className="explore-intro">كل صورة تحمل معنى، وكل فيديو يفتح بابًا للفهم.</p></div></div>{media.length ? <div className="lesson-list">{media.map(item => <article className="lesson-item" key={item.id}><a href={`/media/${encodeURIComponent(item.id)}`}>{item.type === 'صورة' ? <img src={item.url} alt={item.description || item.title} loading="lazy" /> : <div className="lesson-video-preview">{item.thumbnail && <img src={item.thumbnail} alt="" loading="lazy" />}<span aria-hidden="true">▷</span><span>افتح الدرس المرئي</span></div>}<span className="category">{item.purpose}</span><h3>{item.title}</h3></a><p>{item.description}</p>{item.source && <small>المصدر: {item.source}</small>}</article>)}</div> : <div className="media-empty"><h3>المعنى قبل الصورة.</h3><p>ستظهر هنا بطاقات الحكمة والدروس المرئية بعد إضافتها مع وصفها ومصدرها من دفتر التحرير.</p></div>}</div>
      <AssumptionLab ideas={ideas} selected={practice}/>

    </section>}
    {section !== 'observatory' && <Salon content={content} />}
  </>
}
