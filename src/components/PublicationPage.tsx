import {L,useLocale} from '../lib/locale-ui'
import {Teachers} from './Teachers'
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
  if (!embed) return <><L.video className="publication-video" controls preload="metadata" src={url} onError={() => setError(true)}><L.a href={url}>افتح ملف الفيديو</L.a></L.video>{error && <L.p role="status" className="sample-note">تعذّر تحميل الدرس. تحقق من الاتصال، أو افتح رابط الملف مباشرة.</L.p>}<L.a className="text-link" href={url} target="_blank" rel="noopener noreferrer">افتح ملف الفيديو ↗</L.a></>
  return <><L.div className="youtube-player"><L.iframe src={embed} title={title} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></L.div><L.a className="text-link" href={url} target="_blank" rel="noopener noreferrer">شاهد على YouTube ↗</L.a></>
}
export function PublicationPage({ content, info }: { content: Content; info: PageInfo }) {
  const locale=useLocale()
  const [message, setMessage] = useState('')
  async function copyLink() { try { await navigator.clipboard.writeText(location.href); setMessage('نُسخ رابط الصفحة.') } catch { setMessage('تعذّر النسخ. يمكنك نسخ الرابط من شريط المتصفح.') } }
  const isArticle = Boolean(info.idea || info.writing || info.media)
  const text = info.idea?.text ?? info.writing?.text
  return <><L.a className="skip" href="#publication">انتقل إلى المحتوى</L.a><SiteHeader current={info.path} content={content}/><L.main id="publication">
    {info.kind==='teachers'&&<Teachers/>}
    {info.kind==='community'&&<CommunityPage/>}
    {info.kind==='member'&&<MemberSpace/>}
    {info.kind==='explore'&&<Explore content={content}/>}
    {info.kind==='writings'&&<WritingsIndex content={content}/>}
    {info.kind === 'observatory' && <ThoughtSpace content={content} section="observatory" />}
    {info.kind === 'salon' && <ThoughtSpace content={content} section="salon" />}
    {(info.kind === 'library' || info.kind === 'book') && <BookLibrary content={content} book={info.book}/>}
    {info.kind === 'about' && <L.article className="about-page wrap section"><L.h1>من هو كميل ال نهاب؟</L.h1><L.p className="publication-lead">{content.bio}</L.p><L.div className="about-purpose"><L.h2>لماذا هذه المساحة؟</L.h2><L.p>لأن الفكرة تستحق أكثر من مرور عابر. هنا تتجاور الفلسفة والعلم والثقافة: نقرأ، ونختبر الافتراضات، ونتعلّم من اختلاف وجهات النظر.</L.p><L.h2>كيف تقرأ هذه المنصة؟</L.h2><L.p>ابدأ بسؤال في المرصد، اقرأ الفكرة واعتراضها، ثم جرّب صياغة موقفك في مختبر الافتراضات. وحين يُعلن لقاء، شارك في الحوار عبر منصة الجلسة.</L.p><L.a className="primary" href="/observatory">ابدأ من مرصد الأفكار ←</L.a></L.div></L.article>}
    {isArticle && <L.article className="publication-article wrap section"><L.nav className="breadcrumbs" aria-label="مسار الصفحة"><L.a href="/">الرئيسية</L.a><L.span aria-hidden="true">/</L.span><L.a href={info.writing ? '/writings' : '/observatory'}>{info.writing ? 'الكتابات' : 'مرصد الأفكار'}</L.a></L.nav>{info.writing?.publishedAt&&<L.time dateTime={info.writing.publishedAt}>{info.writing.publishedAt}</L.time>}<L.div className="publication-category">{info.idea?.kind ?? info.writing?.category ?? info.media?.purpose}</L.div><L.h1>{info.idea?.title ?? info.writing?.title ?? info.media?.title}</L.h1><L.p className="publication-byline">{info.noindex ? 'نموذج تحريري تجريبي · غير منسوب إلى كميل ال نهاب' : 'من مساحة كميل ال نهاب'}</L.p>
      {info.media && <L.div className="publication-media">{info.media.type === 'صورة' ? <L.img src={info.media.url} alt={info.media.description || info.media.title} /> : <Video url={info.media.url} title={info.media.title} />}<L.p className="publication-lead">{info.media.description}</L.p>{info.media.source && <L.p className="publication-source">المصدر / صاحب الحكمة: {info.media.source}</L.p>}</L.div>}
      {locale==='en'&&text&&/[\u0621-\u064a]/.test(text)&&<L.p className="sample-note">This text is shown in its original Arabic. An English translation has not been published.</L.p>}
      {text && <L.div className="publication-text"><TextDocument text={text} format={info.writing?.format}/></L.div>}
      {info.idea?.counterpoint && <L.aside className="publication-counterpoint"><L.h2>اعتراض يستحق الإنصاف</L.h2><L.p>{info.idea.counterpoint}</L.p></L.aside>}
      {info.idea?.question && <L.aside className="publication-question"><L.h2>السؤال لك الآن</L.h2><L.p>{info.idea.question}</L.p><L.a className="text-link" href={`/observatory?idea=${encodeURIComponent(info.idea.id)}#assumption-lab`}>اختبر موقفك في مختبر الافتراضات ←</L.a></L.aside>}
      {(info.idea?.source || info.idea?.sourceUrl) && <L.p className="publication-source">المصدر: {info.idea.source}{info.idea.sourceUrl && <> · <L.a href={info.idea.sourceUrl} target="_blank" rel="noopener noreferrer">اقرأ المصدر ↗</L.a></>}</L.p>}
      <L.div className="publication-actions"><L.button className="text-link" onClick={copyLink}>انسخ رابط الفكرة</L.button><L.a className="text-link" href="/salon">أكمل السؤال في مجلس الحوار ←</L.a></L.div><L.p role="status" className="sample-note">{message}</L.p>
    </L.article>}
    {info.kind === 'missing' && <L.section className="wrap section missing-page"><L.h1>لم نجد هذه الصفحة.</L.h1><L.p>ربما تغيّر الرابط أو لم تُنشر المادة بعد.</L.p><L.a className="primary" href="/observatory">عد إلى مرصد الأفكار</L.a></L.section>}
  </L.main><ReaderQuestion content={content}/><Newsletter content={content}/><L.div className="wrap publication-contact"><ContactLinks content={content} /></L.div><SiteFooter/></>
}
