import {L} from '../lib/locale-ui'
import type { Content } from '../content'
import { defaultSite } from '../site'
export function ContactLinks({ content }: { content: Content }) {
  const site = content.site ?? defaultSite
  return <L.div className="contact-links">
    {site.showWhatsapp && site.whatsapp && <L.a href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noopener noreferrer"><L.span>واتساب</L.span><L.span>ابدأ الحديث ↗</L.span></L.a>}
    {site.showEmail && site.email && <L.a href={`mailto:${site.email}`}><L.span>البريد الإلكتروني</L.span><L.span dir="ltr">{site.email}</L.span></L.a>}
    {site.showTiktok && site.tiktok && <L.a href={`https://www.tiktok.com/@${site.tiktok}`} target="_blank" rel="noopener noreferrer"><L.span>TikTok</L.span><L.span dir="ltr">@{site.tiktok} ↗</L.span></L.a>}
  </L.div>
}

