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
  hero:()=><section className="hero wrap" aria-labelledby="hero-name"><div className="hero-copy"><h1 id="hero-name">كميل ال نهاب<span className="name-latin" lang="en">KUMEEL AL NAHAB</span></h1><h2 className="preserve-lines">{site.heroTitle}</h2><p className="preserve-lines">{site.heroSubtitle}</p><div className="hero-actions"><a className="primary" href="/observatory">ادخل مرصد الأفكار ←</a><a className="hero-secondary" href="/writings">اقرأ الكتابات ←</a></div></div><figure className="hero-figure"><div className="arch"><img src={site.heroImage} alt={site.heroImageAlt} {...{fetchpriority:'high'}} decoding="async" width={1024} height={1024}/></div><figcaption>مشهد فني · صورة مولّدة</figcaption></figure></section>,
  story:()=><section className="wrap home-block home-story"><span className="section-label">من هو كميل؟</span><p className="preserve-lines">{content.bio}</p><a className="text-link" href="/about">تعرّف إلى المساحة ←</a></section>,
  writings:()=><section className="wrap home-block"><div className="section-heading"><div><span className="section-label">أحدث ما كُتب</span><h2>كلمتان تفتحان بابًا.</h2></div><a className="text-link" href="/writings">عرض كل الكتابات ←</a></div><div className="showcase-grid">{sortedWritings(content.writings).slice(0,2).map(w=><WritingCard key={w.id} writing={w}/>)}</div>{!content.writings.length&&<p>تنتظر هذه المساحة أول كتابة.</p>}</section>,
  explore:()=><section className="featured-thought"><span className="section-label">اكتشف</span><h2>معارف قصيرة واختبار للفهم.</h2><p>اكتشافات علمية وفلسفية مختصرة، وأسئلة تقيس ما بقي منها.</p><a className="text-link" href="/explore">ابدأ الاكتشاف ←</a></section>,
  observatory:()=><section className="featured-thought"><span className="section-label">فكرة مختارة من المرصد</span><h2>{idea?.title??'سؤال أفضل. بداية أوسع.'}</h2><p>{idea?.question??'ما الفكرة التي تستحق أن تراجعها اليوم؟'}</p>{idea&&<><button className="text-link" aria-expanded={revealed} onClick={()=>setRevealed(!revealed)}>زاوية أخرى للتأمل</button>{revealed&&<p role="status">{idea.counterpoint||idea.text.slice(0,240)}</p>}</>}<a className="text-link" href={idea?`/ideas/${encodeURIComponent(idea.id)}`:'/observatory'}>افتح الفكرة واعتراضها ←</a></section>,
  salon:()=><section className="next-salon"><span className="section-label">{schedule?.live?'يجري الآن في المجلس':'اللقاء القادم في المجلس'}</span><h2>{next?.title??'المجلس يبدأ بسؤال.'}</h2>{next?<><time dateTime={next.startsAt}>{new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Riyadh',calendar:'gregory'}).format(new Date(next.startsAt))} · الرياض</time><p>{next.question}</p>{next.registrationUrl&&<a className="primary" href={next.registrationUrl} target="_blank" rel="noopener noreferrer">سجّل حضورك ↗</a>}</>:<p>{now===null?'جارٍ التحقق من الموعد القادم…':'لم يُعلن موعد قادم بعد.'}</p>}<a className="text-link" href="/salon">المواعيد وأرشيف المجلس ←</a></section>,
  teachers:()=><section className="next-salon home-teachers"><span className="section-label">مجلس التعلّم</span><h2>معلمون يساعدونك على الفهم.</h2><p>صفحات تعريفية لمعلمين في الفلسفة والعلم واللغة، يراجعها فريق المنصة قبل نشرها.</p><a className="text-link" href="/teachers">اكتشف المعلمين ←</a><a className="text-link" href="/member#teacher-application">قدّم طلب التدريس</a></section>,
  library:()=>books.length?<section className="wrap home-block"><div className="section-heading"><div><span className="section-label">من المكتبة</span><h2>كتب تستحق الصحبة.</h2></div><a className="text-link" href="/library">تصفّح المكتبة ←</a></div><div className="home-books">{books.map(b=><a key={b.id} className="home-book" href={`/library/${encodeURIComponent(b.id)}`}><strong lang="en" dir="ltr">{b.title}</strong><span>{b.author}</span></a>)}</div></section>:null,
  quote:()=>site.quote.trim()?<section className="quote home-quote"><blockquote className="preserve-lines">{site.quote}</blockquote><p>{site.quoteSource}</p></section>:null,
  contact:()=><section className="wrap home-block home-contact"><div><span className="section-label">تواصل</span><h2>{site.contactTitle}</h2></div><ContactLinks content={content}/></section>,
 }
 // Walk the owner's order; collect neighbouring card sections into one grid row.
 const rows:ReactNode[]=[]
 let cards:ReactNode[]=[]
 const flush=()=>{if(!cards.length)return;rows.push(cards.length===1?<div key={`row-${rows.length}`} className="wrap home-block">{cards}</div>:<div key={`row-${rows.length}`} className={`wrap showcase-grid home-block${cards.length%3===0?" is-three":""}`}>{cards}</div>);cards=[]}
 for(const section of site.sections){
  if(!section.visible)continue
  const node=blocks[section.key]?.()
  if(!node)continue
  if(cardSections.has(section.key)){cards.push(<div key={section.key} className="home-card-slot">{node}</div>);continue}
  flush();rows.push(<div key={section.key} className="home-section">{node}</div>)
 }
 flush()
 return <><a className="skip" href="#main">انتقل إلى المحتوى</a><SiteHeader current="/" content={content}/><main id="main" className="home-showcase">{rows}</main><ReaderQuestion content={content}/><Newsletter content={content}/><SiteFooter/></>
}
