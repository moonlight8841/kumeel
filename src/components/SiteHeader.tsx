import {useEffect,useState} from 'react'
import {ReadingMode} from './ReadingMode'
import {LoginLink} from './LoginLink'
import {siteNav,isCurrentPath} from '../lib/navigation'
import {LanguageSwitch} from './LanguageSwitch'
import type {Content} from '../content'


export function SiteHeader({current,content}:{current?:string;content?:Content}){
 const [open,setOpen]=useState(false)
 useEffect(()=>{if(!open)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[open])
 return <header className="header wrap tree-header"><a className="wordmark" href="/" aria-label="كميل، الرئيسية">كميل<span>.</span></a><button className="menu-toggle" aria-label={open?'إغلاق القائمة':'فتح القائمة'} aria-expanded={open} aria-controls="site-nav" onClick={()=>setOpen(!open)}><span aria-hidden="true">{open?'✕':'☰'}</span></button><nav id="site-nav" className={open?'open':''} aria-label="التنقل الرئيسي">{siteNav.map(([href,label])=><a key={href} href={href} aria-current={isCurrentPath(href,current)?'page':undefined}>{label}</a>)}</nav><div className="header-tools"><LanguageSwitch locale="ar" arabicPath={current||'/'} englishAvailable={!current?.startsWith('/writings/')||Boolean(content?.translations?.[`writing:${content.writings.find(w=>`/writings/${encodeURIComponent(w.id)}`===current)?.id}`])}/><ReadingMode/><LoginLink/></div></header>
}
