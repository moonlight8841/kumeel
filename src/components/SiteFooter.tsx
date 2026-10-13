import {siteNav} from '../lib/navigation'

export function SiteFooter(){
 return <footer className="footer wrap site-footer"><div className="footer-brand"><a href="/" className="wordmark">كميل<span>.</span></a><p>كميل ال نهاب · مساحة للفكر والعلم والحوار</p></div><nav aria-label="روابط التذييل">{siteNav.slice(1).map(([href,label])=><a key={href} href={href}>{label}</a>)}<a href="/explore">اكتشف</a></nav><a className="editor-link" href="/admin">لوحة الإدارة ↗</a></footer>
}
