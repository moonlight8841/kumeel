import {useEffect,useState} from 'react'
import type {Content} from '../../content'
import {contentHealth,contentStats,type AdminTab} from '../../lib/admin'

type Props={content:Content;revision:number|null;draft:boolean;go:(tab:AdminTab)=>void}
const quickActions:[AdminTab,string,string][]=[['writings','✎','كتابة جديدة'],['thoughts','◇','فكرة أو لقاء'],['settings','◐','الهوية والمظهر'],['backup','⇩','نسخة احتياطية']]

export function AdminOverview({content,revision,draft,go}:Props){
 // Time-dependent figures are computed after mount so SSR and hydration agree.
 const [now,setNow]=useState<number|null>(null)
 useEffect(()=>setNow(Date.now()),[])
 const stats=contentStats(content,now??0)
 const issues=now===null?[]:contentHealth(content,now)
 const warnings=issues.filter(i=>i.level==='warning').length
 return <div className="admin-overview">
  <section className={`admin-card admin-publish-state ${draft?'is-warning':'is-success'}`} aria-labelledby="publish-state">
   <div><span className="admin-eyebrow">حالة النشر</span><h2 id="publish-state">{draft?'لديك مسودة لم تُنشر بعد.':'الموقع متطابق مع آخر نسخة منشورة.'}</h2><p>{draft?'التغييرات محفوظة على هذا المتصفح فقط. راجعها ثم انشرها ليراها الزوار.':revision===null?'تعذّر التحقق من النسخة المنشورة. أعد تحميل الصفحة بعد استعادة الاتصال.':`النسخة المنشورة الحالية رقم ${revision.toLocaleString('ar-SA')}.`}</p></div>
   <button className={`admin-btn${draft?' is-primary':''}`} onClick={()=>go('publish')}>{draft?'مراجعة ونشر ←':'إدارة النشر ←'}</button>
  </section>

  <section aria-labelledby="stats-title"><h2 id="stats-title" className="admin-section-title">المحتوى بالأرقام</h2>
   <div className="admin-stats">{stats.map(s=><button key={s.label} className="admin-stat" onClick={()=>go(s.tab)}><strong>{now===null&&s.label==='لقاءات قادمة'?'—':s.value.toLocaleString('ar-SA')}</strong><span>{s.label}</span>{s.detail&&<small>{s.detail}</small>}</button>)}</div>
  </section>

  <div className="admin-overview-grid">
   <section className="admin-card" aria-labelledby="health-title">
    <div className="admin-card-head"><h2 id="health-title">ما يحتاج انتباهك</h2>{now!==null&&<span className={`admin-chip ${warnings?'is-warning':'is-success'}`}>{issues.length?`${issues.length.toLocaleString('ar-SA')} ملاحظات`:'كل شيء جيد'}</span>}</div>
    {now===null?<p className="admin-muted">جارٍ فحص المحتوى…</p>:issues.length?<ul className="admin-health">{issues.map(issue=><li key={issue.id} className={`is-${issue.level}`}><span className="admin-health-dot" aria-hidden="true"/><div><strong>{issue.title}</strong><p>{issue.detail}</p></div><button className="admin-btn is-quiet" onClick={()=>go(issue.tab)}>معالجة</button></li>)}</ul>:<p className="admin-empty">لا توجد ملاحظات. المحتوى جاهز للقرّاء.</p>}
   </section>
   <section className="admin-card" aria-labelledby="quick-title">
    <h2 id="quick-title">اختصارات</h2>
    <div className="admin-quick">{quickActions.map(([key,icon,label])=><button key={key} onClick={()=>go(key)}><span aria-hidden="true">{icon}</span>{label}</button>)}<a href="/" target="_blank" rel="noopener"><span aria-hidden="true">↗</span>معاينة الموقع</a></div>
   </section>
  </div>
 </div>
}
