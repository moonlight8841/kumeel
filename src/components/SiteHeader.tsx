import {L,useLocale} from '../lib/locale-ui'
import {useEffect,useState} from 'react'
import {ReadingMode} from './ReadingMode'
import {LoginLink} from './LoginLink'
import {siteNav,isCurrentPath} from '../lib/navigation'
import {LanguageSwitch} from './LanguageSwitch'
import {resolveLocalePath} from '../lib/i18n'
import type {Content} from '../content'


export function SiteHeader({current}:{current?:string;content?:Content}){
 const locale=useLocale()
 current=resolveLocalePath(current||'/').path
 const [open,setOpen]=useState(false)
 useEffect(()=>{if(!open)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[open])
 return <L.header className="header wrap tree-header"><L.a className="wordmark" href="/" aria-label="كميل، الرئيسية">كميل<L.span>.</L.span></L.a><L.button className="menu-toggle" aria-label={open?'إغلاق القائمة':'فتح القائمة'} aria-expanded={open} aria-controls="site-nav" onClick={()=>setOpen(!open)}><L.span aria-hidden="true">{open?'✕':'☰'}</L.span></L.button><L.nav id="site-nav" className={open?'open':''} aria-label="التنقل الرئيسي">{siteNav.map(([href,label])=><L.a key={href} href={href} aria-current={isCurrentPath(href,current)?'page':undefined}>{label}</L.a>)}</L.nav><L.div className="header-tools"><LanguageSwitch locale={locale} arabicPath={current||'/'} /><ReadingMode/><LoginLink/></L.div></L.header>
}
