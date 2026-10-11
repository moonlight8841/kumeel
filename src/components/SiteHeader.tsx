import {useState} from 'react'
import {ReadingMode} from './ReadingMode'
import {LoginLink} from './LoginLink'
export function SiteHeader(){const [open,setOpen]=useState(false);return <header className="header wrap tree-header"><a className="wordmark" href="/" aria-label="كميل، الرئيسية">كميل<span>.</span></a><button className="menu-toggle" aria-label="القائمة" aria-expanded={open} onClick={()=>setOpen(!open)}>☰</button><nav className={open?'open':''} aria-label="التنقل الرئيسي">{[['/','الرئيسية'],['/about','عن كميل'],['/writings','الكتابات'],['/observatory','مرصد الأفكار'],['/salon','مجلس الحوار'],['/library','المكتبة']].map(([href,label])=><a key={href} href={href}>{label}</a>)}</nav><ReadingMode/><LoginLink/></header>}
