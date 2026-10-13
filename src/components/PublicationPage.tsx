import {CommunityPage} from './CommunityPage'
import {MemberSpace} from './MemberSpace'
import {ReaderQuestion} from './ReaderQuestion'
import {Explore} from './Explore'
import {SiteHeader} from './SiteHeader'
import {SiteFooter} from './SiteFooter'
import {WritingsIndex} from './WritingsIndex'
import {Newsletter} from './Newsletter'
import { ContactLinks } from './ContactLinks'
import { useState } from 'react'
import { youtubeEmbed, type Content } from '../content'
import type { PageInfo } from '../lib/pages'
import { ThoughtSpace } from './ThoughtSpace'
import { BookLibrary } from './BookLibrary'
import {TextDocument} from './TextDocument'

function Video({ url, title }: { url: string; title: string }) {
  const [error, setError] = useState(false)
  const embed = youtubeEmbed(url)
  if (!embed) return <><video className="publication-video" controls preload="metadata" src={url} onError={() => setError(true)}><a href={url}>افتح ملف الفيديو</a></video>{error && <p role="status" className="sample-note">تعذّر تحميل الدرس. تحقق من الاتصال، أو افتح رابط الملف مباشرة.</p>}<a className="text-link" href={url} target="_blank" rel="noopener noreferrer">افتح ملف الفيديو ↗</a></>
  return <><div className="youtube-player"><iframe src={embed} title={title} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div><a className="text-link" href={url} target="_blank" rel="noopener noreferrer">شاهد على YouTube ↗</a></>
}
export function PublicationPage({ content, info }: { content: Content; info: PageInfo }) {
  const [message, setMessage] = useState('')
  async function copyLink() { try { await navigator.clipboard.writeText(location.href); setMessage('نُسخ رابط الصفحة.') } catch { setMessage('تعذّر النسخ. يمكنك نسخ الرابط من شريط المتصفح.') } }
  const isArticle = Boolean(info.idea || info.writing || info.media)
  const text = info.idea?.text ?? info.writing?.text
  return <><a className="skip" href="#publication">انتقل إلى المحتوى</a><SiteHeader current={info.path}/><main id="publication">
    {info.kind==='community'&&<CommunityPage/>}
    {info.kind==='member'&&<MemberSpace/>}
    {info.kind==='explore'&&<Explore content={content}/>}
    {info.kind==='writings'&&<WritingsIndex content={content}/>}
    {info.kind === 'observatory' && <ThoughtSpace content={content} section="observatory" />}
    {info.kind === 'salon' && <ThoughtSpace content={content} section="salon" />}
    {(info.kind === 'library' || info.kind === 'book') && <BookLibrary content={content} book={info.book}/>}
    {info.kind === 'about' && <article className="about-page wrap section"><h1>من هو كميل ال نهاب؟</h1><p className="publication-lead">{content.bio}</p><div className="about-purpose"><h2>لماذا هذه المساحة؟</h2><p>لأن الفكرة تستحق أكثر من مرور عابر. هنا تتجاور الفلسفة والعلم والثقافة: نقرأ، ونختبر الافتراضات، ونتعلّم من اختلاف وجهات النظر.</p><h2>كيف تقرأ هذه المنصة؟</h2><p>ابدأ بسؤال في المرصد، اقرأ الفكرة واعتراضها، ثم جرّب صياغة موقفك في مختبر الافتراضات. وحين يُعلن لقاء، شارك في الحوار عبر منصة الجلسة.</p><a className="primary" href="/observatory">ابدأ من مرصد الأفكار ←</a></div></article>}
    {isArticle && <article className="publication-article wrap section"><nav className="breadcrumbs" aria-label="مسار الصفحة"><a href="/">الرئيسية</a><span aria-hidden="true">/</span><a href={info.writing ? '/writings' : '/observatory'}>{info.writing ? 'الكتابات' : 'مرصد الأفكار'}</a></nav>{info.writing?.publishedAt&&<time dateTime={info.writing.publishedAt}>{info.writing.publishedAt}</time>}<div className="publication-category">{info.idea?.kind ?? info.writing?.category ?? info.media?.purpose}</div><h1>{info.idea?.title ?? info.writing?.title ?? info.media?.title}</h1><p className="publication-byline">{info.noindex ? 'نموذج تحريري تجريبي · غير منسوب إلى كميل ال نهاب' : 'من مساحة كميل ال نهاب'}</p>
      {info.media && <div className="publication-media">{info.media.type === 'صورة' ? <img src={info.media.url} alt={info.media.description || info.media.title} /> : <Video url={info.media.url} title={info.media.title} />}<p className="publication-lead">{info.media.description}</p>{info.media.source && <p className="publication-source">المصدر / صاحب الحكمة: {info.media.source}</p>}</div>}
      {text && <div className="publication-text"><TextDocument text={text} format={info.writing?.format}/></div>}
      {info.idea?.counterpoint && <aside className="publication-counterpoint"><h2>اعتراض يستحق الإنصاف</h2><p>{info.idea.counterpoint}</p></aside>}
      {info.idea?.question && <aside className="publication-question"><h2>السؤال لك الآن</h2><p>{info.idea.question}</p><a className="text-link" href={`/observatory?idea=${encodeURIComponent(info.idea.id)}#assumption-lab`}>اختبر موقفك في مختبر الافتراضات ←</a></aside>}
      {(info.idea?.source || info.idea?.sourceUrl) && <p className="publication-source">المصدر: {info.idea.source}{info.idea.sourceUrl && <> · <a href={info.idea.sourceUrl} target="_blank" rel="noopener noreferrer">اقرأ المصدر ↗</a></>}</p>}
      <div className="publication-actions"><button className="text-link" onClick={copyLink}>انسخ رابط الفكرة</button><a className="text-link" href="/salon">أكمل السؤال في مجلس الحوار ←</a></div><p role="status" className="sample-note">{message}</p>
    </article>}
    {info.kind === 'missing' && <section className="wrap section missing-page"><h1>لم نجد هذه الصفحة.</h1><p>ربما تغيّر الرابط أو لم تُنشر المادة بعد.</p><a className="primary" href="/observatory">عد إلى مرصد الأفكار</a></section>}
  </main><ReaderQuestion content={content}/><Newsletter content={content}/><div className="wrap publication-contact"><ContactLinks content={content} /></div><SiteFooter/></>
}
