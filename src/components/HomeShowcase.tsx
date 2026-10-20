import {TEACHERS_PUBLIC} from '../lib/features'
import {L} from '../lib/locale-ui'
import {ReaderQuestion} from './ReaderQuestion'
import {sortedWritings} from '../lib/writings'
import {useEffect,useState,type ReactNode} from 'react'
import type {Content} from '../content'
import {defaultSite,withLibrary,type SectionKey} from '../site'
import {booksFor} from '../books'
import {salonSchedule} from '../lib/salon'
import {SiteHeader} from './SiteHeader'
import {SiteFooter} from './SiteFooter'
import {WritingCard} from './WritingsIndex'
import {Newsletter} from './Newsletter'
import {ContactLinks} from './ContactLinks'
import {SkyReflection} from './SkyReflection'

// Card sections sit side by side when the owner places them next to each other.
const cardSections=new Set<SectionKey>(['observatory','salon','teachers','explore'])

export function HomeShowcase({content}:{content:Content}){
 const site=withLibrary(content.site??defaultSite)
 const [now,setNow]=useState<number|null>(null)
 const [revealed,setRevealed]=useState(false)
 useEffect(()=>{setNow(Date.now());const t=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(t)},[])
 const idea=content.ideas?.[0]
 const schedule=now===null?null:salonSchedule(content.sessions??[],now)
 const next=schedule?.live??schedule?.next
 const books=booksFor(content).slice(0,3)
 const blocks:Record<SectionKey,()=>ReactNode>={
  music:()=><L.section className="wrap home-block"><L.div className="section-heading"><L.div><L.span className="section-label">على مهل</L.span><L.h2>الموسيقى والفيديو</L.h2></L.div><L.a className="text-link" href="/music">استكشف المقاطع ←</L.a></L.div><L.p className="publication-lead">مساحة للاستماع والمشاهدة. اختر ما يناسب لحظتك، وابدأ حين ترغب.</L.p></L.section>,
  hero:()=><L.section className="hero wrap" aria-labelledby="hero-name"><L.div className="hero-copy"><L.h1 id="hero-name">كميل ال نهاب<L.span className="name-latin" lang="en">KUMEEL AL NAHAB</L.span></L.h1><L.h2 className="preserve-lines">{site.heroTitle}</L.h2><L.p className="preserve-lines">{site.heroSubtitle}</L.p><L.div className="hero-actions"><L.a className="primary" href="/observatory">ادخل مرصد الأفكار ←</L.a><L.a className="hero-secondary" href="/writings">اقرأ الكتابات ←</L.a></L.div></L.div><L.figure className="hero-figure"><L.div className="arch"><L.img src={site.heroImage} alt={site.heroImageAlt} {...{fetchpriority:'high'}} decoding="async" width={1024} height={1024}/></L.div><L.figcaption>مشهد فني · صورة مولّدة</L.figcaption></L.figure></L.section>,
  story:()=><L.section className="wrap home-block home-story"><L.span className="section-label">من هو كميل؟</L.span><L.p className="preserve-lines">{content.bio}</L.p><L.a className="text-link" href="/about">تعرّف إلى المساحة ←</L.a></L.section>,
  writings:()=><L.section className="wrap home-block"><L.div className="section-heading"><L.div><L.span className="section-label">أحدث ما كُتب</L.span><L.h2>كلمتان تفتحان بابًا.</L.h2></L.div><L.a className="text-link" href="/writings">عرض كل الكتابات ←</L.a></L.div><L.div className="showcase-grid">{sortedWritings(content.writings).slice(0,2).map(w=><WritingCard key={w.id} writing={w}/>)}</L.div>{!content.writings.length&&<L.p>تنتظر هذه المساحة أول كتابة.</L.p>}</L.section>,
  explore:()=><L.section className="featured-thought"><L.span className="section-label">اكتشف</L.span><L.h2>معارف قصيرة واختبار للفهم.</L.h2><L.p>اكتشافات علمية وفلسفية مختصرة، وأسئلة تقيس ما بقي منها.</L.p><L.a className="text-link" href="/explore">ابدأ الاكتشاف ←</L.a></L.section>,
  observatory:()=><L.section className="featured-thought"><L.span className="section-label">فكرة مختارة من المرصد</L.span><L.h2>{idea?.title??'سؤال أفضل. بداية أوسع.'}</L.h2><L.p>{idea?.question??'ما الفكرة التي تستحق أن تراجعها اليوم؟'}</L.p>{idea&&<><L.button className="text-link" aria-expanded={revealed} onClick={()=>setRevealed(!revealed)}>زاوية أخرى للتأمل</L.button>{revealed&&<L.p role="status">{idea.counterpoint||idea.text.slice(0,240)}</L.p>}</>}<L.a className="text-link" href={idea?`/ideas/${encodeURIComponent(idea.id)}`:'/observatory'}>افتح الفكرة واعتراضها ←</L.a></L.section>,
  salon:()=><L.section className="next-salon"><L.span className="section-label">{schedule?.live?'يجري الآن في المجلس':'اللقاء القادم في المجلس'}</L.span><L.h2>{next?.title??'المجلس يبدأ بسؤال.'}</L.h2>{next?<><L.time dateTime={next.startsAt}>{new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Riyadh',calendar:'gregory'}).format(new Date(next.startsAt))} · الرياض</L.time><L.p>{next.question}</L.p>{next.registrationUrl&&<L.a className="primary" href={next.registrationUrl} target="_blank" rel="noopener noreferrer">سجّل حضورك ↗</L.a>}</>:<L.p>{now===null?'جارٍ التحقق من الموعد القادم…':'لم يُعلن موعد قادم بعد.'}</L.p>}<L.a className="text-link" href="/salon">المواعيد وأرشيف المجلس ←</L.a></L.section>,
  teachers:()=><L.section className="next-salon home-teachers"><L.span className="section-label">مجلس التعلّم</L.span><L.h2>معلمون يساعدونك على الفهم.</L.h2><L.p>صفحات تعريفية لمعلمين في الفلسفة والعلم واللغة، يراجعها فريق المنصة قبل نشرها.</L.p><L.a className="text-link" href="/teachers">اكتشف المعلمين ←</L.a><L.a className="text-link" href="/member#teacher-application">قدّم طلب التدريس</L.a></L.section>,
  library:()=>books.length?<L.section className="wrap home-block"><L.div className="section-heading"><L.div><L.span className="section-label">من المكتبة</L.span><L.h2>كتب تستحق الصحبة.</L.h2></L.div><L.a className="text-link" href="/library">تصفّح المكتبة ←</L.a></L.div><L.div className="home-books">{books.map(b=><L.a key={b.id} className="home-book" href={`/library/${encodeURIComponent(b.id)}`}><L.strong lang="en" dir="ltr">{b.title}</L.strong><L.span>{b.author}</L.span></L.a>)}</L.div></L.section>:null,
  quote:()=>site.quote.trim()?<SkyReflection quote={site.quote} source={site.quoteSource} writings={content.writings}/>:null,
  contact:()=><L.section className="wrap home-block home-contact"><L.div><L.span className="section-label">تواصل</L.span><L.h2>{site.contactTitle}</L.h2></L.div><ContactLinks content={content}/></L.section>,
 }
 // Walk the owner's order; collect neighbouring card sections into one grid row.
 const rows:ReactNode[]=[]
 let cards:ReactNode[]=[]
 const flush=()=>{if(!cards.length)return;rows.push(cards.length===1?<L.div key={`row-${rows.length}`} className="wrap home-block">{cards}</L.div>:<L.div key={`row-${rows.length}`} className={`wrap showcase-grid home-block${cards.length%3===0?" is-three":""}`}>{cards}</L.div>);cards=[]}
 for(const section of site.sections){
  if(!section.visible||(section.key==='teachers'&&!TEACHERS_PUBLIC))continue
  const node=blocks[section.key]?.()
  if(!node)continue
  if(cardSections.has(section.key)){cards.push(<L.div key={section.key} className="home-card-slot">{node}</L.div>);continue}
  flush();rows.push(<L.div key={section.key} className="home-section">{node}</L.div>)
 }
 flush()
 return <><L.a className="skip" href="#main">انتقل إلى المحتوى</L.a><SiteHeader current="/" content={content}/><L.main id="main" className="home-showcase">{rows}</L.main><ReaderQuestion content={content}/><Newsletter content={content}/><SiteFooter/></>
}
