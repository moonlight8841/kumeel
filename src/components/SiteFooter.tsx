import {L} from '../lib/locale-ui'
import {siteNav} from '../lib/navigation'

export function SiteFooter(){
 return <L.footer className="footer wrap site-footer"><L.div className="footer-brand"><L.a href="/" className="wordmark">كميل<L.span>.</L.span></L.a><L.p>كميل ال نهاب · مساحة للفكر والعلم والحوار</L.p></L.div><L.nav aria-label="روابط التذييل">{siteNav.slice(1).map(([href,label])=><L.a key={href} href={href}>{label}</L.a>)}<L.a href="/explore">اكتشف</L.a></L.nav><L.a className="editor-link" href="/admin">لوحة الإدارة ↗</L.a></L.footer>
}
