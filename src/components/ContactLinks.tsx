import type { Content } from '../content'
import { defaultSite } from '../site'
export function ContactLinks({ content }: { content: Content }) {
  const site = content.site ?? defaultSite
  return <div className="contact-links">
    {site.showWhatsapp && site.whatsapp && <a href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noopener noreferrer"><span>واتساب</span><span>ابدأ الحديث ↗</span></a>}
    {site.showEmail && site.email && <a href={`mailto:${site.email}`}><span>البريد الإلكتروني</span><span dir="ltr">{site.email}</span></a>}
    {site.showTiktok && site.tiktok && <a href={`https://www.tiktok.com/@${site.tiktok}`} target="_blank" rel="noopener noreferrer"><span>TikTok</span><span dir="ltr">@{site.tiktok} ↗</span></a>}
  </div>
}

