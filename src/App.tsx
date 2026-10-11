import { useEffect, useState, type ReactNode } from 'react'
import { initialContent, validContent } from './content'
import type { Content } from './content'
import './App.css'
import './platform.css'
import './identity.css'
import { ThoughtSpace } from './components/ThoughtSpace'
import { AdminPanel } from './components/AdminPanel'
import { ContactLinks } from './components/ContactLinks'
import { defaultSite, withLibrary, type SectionKey } from './site'
import {booksFor} from './books'
import { PublicationPage } from './components/PublicationPage'
import { pageInfo, structuredData } from './lib/pages'
import { Explore } from './components/Explore'
import { readPublished } from './lib/cloud'
import {LoginLink} from './components/LoginLink'
const Arrow = () => <span aria-hidden="true">↗</span>
function App({ startingContent = initialContent, startingPath = '/' }: { startingContent?: Content; startingPath?: string }) {
 const [content, setContent] = useState<Content>(startingContent)
 const [filter, setFilter] = useState('الكل')
 const [menu, setMenu] = useState(false)
 const [notice, setNotice] = useState('')
 const [draft, setDraft] = useState(false)
 const [revision, setRevision] = useState<number | null>(null)
 useEffect(() => { try { const saved = localStorage.getItem('kumeel-journal-v1'); if (saved) { const parsed: unknown = JSON.parse(saved); if (validContent(parsed)) { setContent(parsed); setDraft(true) } } } catch { setNotice('تعذّر تحميل المسودة المحفوظة.') } }, [])
 useEffect(() => { let active = true; readPublished().then(result => { if (!active) return; setRevision(result.revision); let hasDraft = false; try { hasDraft = validContent(JSON.parse(localStorage.getItem('kumeel-journal-v1') || 'null')) } catch { /* Invalid local data must not hide a published update. */ } if (!hasDraft) setContent(result.content) }).catch(() => { if (active) setNotice('تعذّر تحديث النسخة المنشورة؛ نعرض آخر نسخة متاحة.') }); return () => { active = false } }, [])
 const page = pageInfo(content, startingPath)
 useEffect(() => {
   const info = pageInfo(content, startingPath)
   document.title = info.title
   const tags = [['name', 'description', info.description], ['name', 'robots', info.noindex || draft ? 'noindex, follow' : 'index, follow'], ['property', 'og:title', info.title], ['property', 'og:description', info.description], ['property', 'og:type', info.idea || info.writing ? 'article' : 'website']]
   for (const [attribute, name, value] of tags) {
     let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`)
     if (!tag) { tag = document.createElement('meta'); tag.setAttribute(attribute, name); document.head.append(tag) }
     tag.content = value
   }
   let schema = document.getElementById('kumeel-schema')
   if (!schema) { schema = document.createElement('script'); schema.setAttribute('type', 'application/ld+json'); schema.id = 'kumeel-schema'; document.head.append(schema) }
   const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
   const origin = canonical ? new URL(canonical.href).origin : ''
   schema.textContent = JSON.stringify(structuredData(content, info, origin))
 }, [content, startingPath, draft])
 function save(next: Content) { if (!validContent(next)) { setNotice('المحتوى غير صالح أو تجاوز حدود الدفتر. راجع الحقول والروابط.'); return false } try { localStorage.setItem('kumeel-journal-v1', JSON.stringify(next)); setContent(next); setDraft(true); setNotice('حُفظت المسودة على هذا المتصفح.'); return true } catch { setNotice('لم يتم الحفظ؛ مساحة المتصفح غير كافية. صدّر نسخة من محتواك.'); return false } }
 const site = withLibrary(content.site ?? defaultSite)
 if (page.kind === 'admin') return <AdminPanel content={content} revision={revision} onSave={save} onPublish={(next, version) => { setContent(next); setRevision(version); setDraft(false); try { localStorage.removeItem('kumeel-journal-v1') } catch { /* Published state is authoritative. */ } }} />
 if (page.kind !== 'home') return <div className={`site-shell theme-${site.theme}`}><PublicationPage content={content} info={page} />{draft && <div className="draft-banner">تُعرض مسودتك المحلية · لم تُنشر على الإنترنت</div>}</div>
 const sections: Record<SectionKey, ReactNode> = {
hero: <><section className="hero wrap"><div className="hero-copy"><h1>كميل ال نهاب<span className="name-latin" lang="en">KUMEEL AL NAHAB</span></h1><h2 className="preserve-lines">{site.heroTitle}</h2><p className="preserve-lines">{site.heroSubtitle}</p><a className="primary" href="#observatory">ادخل مرصد الأفكار <span>←</span></a><a className="hero-secondary" href="#salon">مجلس الحوار <span>↙</span></a></div><figure className="hero-figure"><div className="arch"><img src={site.heroImage} alt={site.heroImageAlt} /></div><div className="seal" aria-hidden="true"><span>نمضي ويبقى</span><b>الأثر</b><span>✦</span></div><figcaption><span>لكلّ طريقٍ حكاية.</span><span className="image-note">مشهد فني · صورة مولّدة</span></figcaption></figure><span className="side-note" lang="en">A LITTLE OF ME. A LOT OF LIFE.</span></section>
 <div className="section-rule wrap"><span>✳</span></div>
 <section className="chapters wrap" aria-label="أبواب المساحة">{[{n:'01',title:'حكايتي',text:'ما تصنعه الأيام فينا، وما نصنعه نحن من أيامنا.',href:'#story',icon:'◡'},{n:'02',title:'كتاباتي',text:'حين تضيق العبارة، تتّسع القصيدة. هنا تسكن الكلمات.',href:'#writings',icon:'✎'},{n:'03',title:'مرصد الأفكار',text:'حكمة نختبرها، ودرس نفهمه، وسؤال يستحق الحوار.',href:'#observatory',icon:'◎'}].map(c => <a href={c.href} key={c.n}><span className="chapter-icon">{c.icon}</span><div><h3>{c.title}</h3><p>{c.text}</p></div><span className="chapter-number">{c.n}</span></a>)}</section></>,
story: <><section id="story" className="story wrap section"><div><div className="section-label">الفصل الأول <span>01 /</span></div><h2>خلف الاسم،<br />رغبةٌ في الفهم.</h2><span className="signature">كميل ال نهاب</span></div><div className="story-body"><p>{content.bio}</p><p className="muted">هذه مساحة للتعلّم ومراجعة الأفكار. نميّز الرأي عن الدليل، ونذكر المصدر، ونترك للاعتراض فرصة عادلة.</p><a className="text-link" href="/about">تعرّف على كميل ال نهاب <span>←</span></a></div></section></>,
writings: <><section id="writings" className="writing-section"><div className="wrap section"><div className="section-heading"><div><div className="section-label">بين السطور <span>02 /</span></div><h2>للروحِ مسوّدة.</h2></div><div className="tabs" aria-label="تصفية الكتابات">{['الكل','فلسفة','علوم','ثقافة','تأملات','شعر'].map(f => <button aria-pressed={filter === f} className={filter === f ? 'active' : ''} key={f} onClick={() => setFilter(f)}>{f}</button>)}</div></div><div className="writing-list">{content.writings.filter(w => filter === 'الكل' || filter === w.category).map((w,i) => <a className="writing-row" key={w.id} href={`/writings/${encodeURIComponent(w.id)}`}><span className="writing-index">0{i+1}</span><div><span className="category">{w.category}</span><h3>{w.title}</h3><p>{w.text.split('\n')[0]}</p></div><span className="read-arrow">↖</span></a>)}</div>{content.writings.some(w => initialContent.writings.some(sample => sample.id === w.id && sample.text === w.text)) && <p className="sample-note">تتضمن القائمة نماذج تجريبية غير منسوبة إلى كميل؛ تُميّز في صفحاتها.</p>}</div></section></>,
explore: <><Explore content={content} /></>,
observatory: <><ThoughtSpace content={content} section="observatory" /></>,
salon: <><ThoughtSpace content={content} section="salon" /></>,
library: <section id="library" className="library-preview wrap section"><div><span className="section-label">مكتبة كميل / من القراءة إلى الفهم</span><h2>كتابٌ واحد.<br/>نافذةٌ جديدة.</h2><p>{booksFor(content).length.toLocaleString('ar-SA')} كتابًا في الفلسفة وتعلّم الإنجليزية. اختر بدايةً، وابنِ رفّك الشخصي.</p><a className="primary" href="/library">افتح المكتبة ←</a></div><div className="library-preview-titles">{booksFor(content).filter(b=>b.featured).slice(0,3).map(b=><a key={b.id} href={`/library/${b.id}`}><span>{b.subtitle}</span><strong lang="en" dir="ltr">{b.title}</strong><span dir="auto">{b.author}</span></a>)}</div></section>,
quote: <><section className="quote"><span>“</span><blockquote className="preserve-lines">{site.quote}</blockquote><p>{site.quoteSource}</p></section></>,
contact: <><section id="contact" className="contact wrap"><div><div className="section-label">والحكاية مستمرّة</div><h2>{site.contactTitle}</h2></div><div><p>هنا يبدأ سؤالٌ آخر.<br />تجد مواعيد اللقاءات وروابط المشاركة في مجلس الحوار.</p><ContactLinks content={content} /></div></section></>
 }
 return <div className={`site-shell theme-${site.theme}`}>
 <a href="#main" className="skip">انتقل إلى المحتوى</a>
 <header className="header wrap"><a href="#" className="wordmark" aria-label="كميل، الرئيسية">كميل<span>.</span></a><button className="menu-toggle" aria-label="القائمة" aria-expanded={menu} onClick={() => setMenu(!menu)}>☰</button><nav className={menu ? 'open' : ''} aria-label="التنقل الرئيسي">{[['#','الرئيسية'],['/about','من هو كميل؟'],['#writings','كتاباتي'],['#explore','اكتشف'],['#observatory','مرصد الأفكار'],['/library','\u0627\u0644\u0645\u0643\u062a\u0628\u0629'],['#salon','مجلس الحوار']].map(([href,label]) => <a key={href} href={href} onClick={() => setMenu(false)}>{label}</a>)}</nav><LoginLink/><a href="#contact" className="contact-link">لنتحدث <Arrow /></a></header>
 <main id="main">
 {site.sections.filter(s => s.visible).map(s => <div key={s.key}>{sections[s.key]}</div>)}
 </main><footer className="footer wrap"><a href="#" className="wordmark">كميل<span>.</span></a><p>© {new Date().getFullYear()} كميل ال نهاب · مساحة تشبهني</p><a className="editor-link" href="/admin">لوحة الإدارة ↗</a></footer>
 {draft && <div className="draft-banner">تُعرض مسودتك المحلية · لم تُنشر على الإنترنت</div>}
 <div role="status" className={notice ? 'toast' : ''} onClick={() => setNotice('')}>{notice}</div>

 </div>
}
export default App
