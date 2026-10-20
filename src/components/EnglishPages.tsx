import {TEACHERS_PUBLIC} from '../lib/features'
import type {Content} from '../content'
import {messages,resolveLocalePath,localePath} from '../lib/i18n'
import {LanguageSwitch} from './LanguageSwitch'
import {TextDocument} from './TextDocument'
const m=messages.en
export function EnglishPages({content,pathname}:{content:Content;pathname:string}){
 const route=resolveLocalePath(pathname)
 const writing=route.path.startsWith('/writings/')?content.writings.find(w=>`/writings/${encodeURIComponent(w.id)}`===route.path):undefined
 const record=writing?content.translations?.[`writing:${writing.id}`]:undefined
 const bio=content.translations?.bio
 const available=content.writings.filter(w=>content.translations?.[`writing:${w.id}`])
 const missing=!route.supported||(route.path.startsWith('/writings/')&&!record)
 const cards=<>{available.length?available.map(w=>{const t=content.translations![`writing:${w.id}`]!;return <article className="english-card" key={w.id}><h2><a href={localePath('en',`/writings/${encodeURIComponent(w.id)}`)}>{t.title}</a></h2><p>{t.text.slice(0,180)}</p></article>}):<p>{m.empty}</p>}</>
 return <div lang="en" dir="ltr" className="english-site">
  <a className="skip" href="#english-main">{m.skip}</a>
  <header className="wrap english-header"><a className="wordmark" href="/en/">Kumeel<span>.</span></a><nav aria-label={m.navigation}><a href="/en/">{m.home}</a><a href="/en/about">{m.about}</a><a href="/en/writings">{m.writings}</a></nav><LanguageSwitch locale="en" arabicPath={route.supported?route.path:'/'} englishAvailable={Boolean(!writing||record)}/></header>
  <main id="english-main" className="wrap section english-main">
   {missing?<><h1>{m.notFound}</h1><p>{m.unavailable}</p><a href={route.supported?route.path:'/'} lang="ar">{m.original}</a></>:
   route.path==='/'?<><h1>{m.owner}</h1><p className="publication-lead">{m.hero}</p><p>{m.tagline}</p><div className="english-actions"><a className="primary" href="/en/writings">{m.read}</a><a href="/en/about">{m.learn}</a></div><section><h2>{m.latest}</h2><div className="english-grid">{cards}</div></section></>:
   route.path==='/about'?<article><h1>{m.about}</h1>{bio?<TextDocument text={bio.text}/>:<p>{m.bioEmpty}</p>}<a href="/about" lang="ar">{m.original}</a></article>:
   route.path==='/writings'?<><h1>{m.writings}</h1><p>{m.reviewed}</p><div className="english-grid">{cards}</div></>:
   record?<article><a href="/en/writings">{m.back}</a><h1>{record.title}</h1><p className="sample-note">{m.reviewed}</p><TextDocument text={record.text} format={writing?.format}/><a href={route.path} lang="ar">{m.original}</a></article>:null}
  </main>
  <footer className="wrap english-footer"><p>{m.owner} · {m.tagline}</p><nav aria-label={m.footer}><a href="/community">{m.community} ({m.arabicSection})</a><a href="/library">{m.library} ({m.arabicSection})</a><a href="/salon">{m.salon} ({m.arabicSection})</a>{TEACHERS_PUBLIC&&<a href="/teachers">{m.teachers} ({m.arabicSection})</a>}<a href="/observatory">{m.observatory} ({m.arabicSection})</a><a href="/explore">{m.discover} ({m.arabicSection})</a></nav><p>{m.chatArabic}</p><a href="/">{m.openArabic}</a></footer>
 </div>
}
