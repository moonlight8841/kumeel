export type SectionKey = 'hero' | 'story' | 'writings' | 'explore' | 'observatory' | 'salon' | 'library' | 'quote' | 'contact'
export type SiteSettings = {
  heroTitle: string; heroSubtitle: string; heroImage: string; heroImageAlt: string;
  quote: string; quoteSource: string; contactTitle: string;
  email: string; tiktok: string; whatsapp: string;
  showEmail: boolean; showTiktok: boolean; showWhatsapp: boolean;
  theme: 'olive' | 'ink'; sections: { key: SectionKey; label: string; visible: boolean }[];
}
export const defaultSite: SiteSettings = {
  heroTitle: 'سؤالٌ يوقظ الفكر،\nوحوارٌ يفتح الأفق.', heroSubtitle: 'مساحة للفلسفة والعلم والثقافة.\nنختبر الأفكار، وننصف الأسئلة، ونتعلّم معًا.',
  heroImage: '/images/desert.png', heroImageAlt: 'مشهد فني لكثبان الصحراء ومسافر صغير في الأفق',
  quote: 'لسنا ما نملك من الأشياء،\nبل ما نتركه في الآخرين من أثر.', quoteSource: 'فكرة تفتح باب هذه المساحة',
  contactTitle: 'لنفتح بابًا لفكرة جديدة.', email: 'kumeelalnahab@gmail.com', tiktok: 'kumeelalnahab', whatsapp: '966558232644',
  showEmail: true, showTiktok: true, showWhatsapp: true, theme: 'olive',
  sections: [
    { key: 'hero', label: 'الرئيسية', visible: true }, { key: 'story', label: 'من هو كميل؟', visible: true },
    { key: 'writings', label: 'كتاباتي', visible: true }, { key: 'explore', label: 'اكتشف', visible: true },
    { key: 'observatory', label: 'مرصد الأفكار', visible: true }, { key: 'salon', label: 'مجلس الحوار', visible: true },
    { key: 'library', label: 'مكتبة الكتب', visible: true },
    { key: 'quote', label: 'فكرة للتأمل', visible: true }, { key: 'contact', label: 'تواصل', visible: true },
  ],
}
export function withLibrary(site:SiteSettings):SiteSettings{
 if(site.sections.some(s=>s.key==='library'))return site
 const sections=[...site.sections]
 const index=sections.findIndex(s=>s.key==='quote')
 sections.splice(index<0?sections.length:index,0,{key:'library',label:'مكتبة الكتب',visible:true})
 return {...site,sections}
}
export function validSite(value: unknown): value is SiteSettings {
  if (!value || typeof value !== 'object') return false
  const s = value as SiteSettings
  const str = (v: unknown, max: number) => typeof v === 'string' && v.length <= max
  const image = (v: unknown) => typeof v === 'string' && (/^\/images\/[^\s]+$/.test(v) || (() => { try { const url = new URL(v); return v.length <= 2000 && url.protocol === 'https:' && !url.username && !url.password && ![...v].some(c => c.charCodeAt(0) <= 32) } catch { return false } })())
  return str(s.heroTitle, 300) && Boolean(s.heroTitle.trim()) && str(s.heroSubtitle, 1000) && image(s.heroImage) && str(s.heroImageAlt, 500) && str(s.quote, 1500) && str(s.quoteSource, 500) && str(s.contactTitle, 300) && str(s.email, 254) && (!s.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) && str(s.tiktok, 24) && (!s.tiktok || /^[a-zA-Z0-9_.]{1,24}$/.test(s.tiktok)) && str(s.whatsapp, 15) && (!s.whatsapp || /^[1-9][0-9]{6,14}$/.test(s.whatsapp)) && [s.showEmail, s.showTiktok, s.showWhatsapp].every(v => typeof v === 'boolean') && ['olive', 'ink'].includes(s.theme) && Array.isArray(s.sections) && (s.sections.length === defaultSite.sections.length || s.sections.length === defaultSite.sections.length-1) && defaultSite.sections.filter(d=>d.key!=='library').every(d=>s.sections.some(v=>v?.key===d.key)) && s.sections.every(v => v && defaultSite.sections.some(d => d.key === v.key) && str(v.label, 60) && typeof v.visible === 'boolean') && new Set(s.sections.map(v => v.key)).size === s.sections.length && s.sections.some(v => v.visible)
}
