import {L} from '../lib/locale-ui'
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
    {section !== 'salon' && <L.section id="observatory" className="observatory wrap section">
      <L.div className="section-heading"><L.div><L.div className="section-label">مرصد الأفكار</L.div><L.h2>فكرة تستحق أن نختلف حولها.</L.h2><L.p className="explore-intro">حكمة نختبرها، ودرس نفهمه، وسؤال يبقى مفتوحًا.</L.p></L.div><L.a className="text-link" href="/observatory">المرصد كاملًا <L.span aria-hidden="true">↗</L.span></L.a></L.div>
      <L.div className="tabs thought-tabs" aria-label="تصفية الأفكار">{['الكل', 'حكمة', 'درس', 'تجربة فكرية'].map(kind => <L.button key={kind} aria-pressed={filter === kind} className={filter === kind ? 'active' : ''} onClick={() => setFilter(kind)}>{kind}</L.button>)}</L.div>
      <MindPlay ideas={ideas} content={content} onPractice={idea=>setPractice({...idea})}/>
      <L.div className="thought-list">{ideas.filter(i => filter === 'الكل' || filter === i.kind).map(idea => <L.article className={`thought-item ${idea.kind === 'حكمة' ? 'thought-wisdom' : ''}`} key={idea.id}><L.div className="thought-meta"><L.span>{idea.kind}</L.span>{idea.sample && <L.small>نموذج تحريري · غير منسوب إلى كميل</L.small>}</L.div><L.h3><L.a href={`/ideas/${encodeURIComponent(idea.id)}`}>{idea.title}</L.a></L.h3><L.p>{idea.text.split('\n\n')[0]}</L.p><L.div className="thought-question"><L.span>سؤال للتأمل</L.span><L.p>{idea.question}</L.p></L.div><L.a className="text-link" href={`/ideas/${encodeURIComponent(idea.id)}`}>افتح الفكرة واعتراضها <L.span aria-hidden="true">←</L.span></L.a></L.article>)}</L.div>
      {!ideas.some(i => filter === 'الكل' || filter === i.kind) && <L.div className="empty"><L.h3>هذه المساحة تنتظر فكرتها الأولى.</L.h3><L.p>تُضاف الأفكار من دفتر التحرير.</L.p></L.div>}
      <L.div className="visual-lessons"><L.div className="section-heading"><L.div><L.h3>حكمة تُرى، وفكرة تُشرح.</L.h3><L.p className="explore-intro">كل صورة تحمل معنى، وكل فيديو يفتح بابًا للفهم.</L.p></L.div></L.div>{media.length ? <L.div className="lesson-list">{media.map(item => <L.article className="lesson-item" key={item.id}><L.a href={`/media/${encodeURIComponent(item.id)}`}>{item.type === 'صورة' ? <L.img src={item.url} alt={item.description || item.title} loading="lazy" /> : <L.div className="lesson-video-preview">{item.thumbnail && <L.img src={item.thumbnail} alt="" loading="lazy" />}<L.span aria-hidden="true">▷</L.span><L.span>افتح الدرس المرئي</L.span></L.div>}<L.span className="category">{item.purpose}</L.span><L.h3>{item.title}</L.h3></L.a><L.p>{item.description}</L.p>{item.source && <L.small>المصدر: {item.source}</L.small>}</L.article>)}</L.div> : <L.div className="media-empty"><L.h3>المعنى قبل الصورة.</L.h3><L.p>ستظهر هنا بطاقات الحكمة والدروس المرئية بعد إضافتها مع وصفها ومصدرها من دفتر التحرير.</L.p></L.div>}</L.div>
      <AssumptionLab ideas={ideas} selected={practice}/>

    </L.section>}
    {section !== 'observatory' && <Salon content={content} />}
  </>
}
