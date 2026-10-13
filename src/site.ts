export type SectionKey = 'hero' | 'story' | 'writings' | 'explore' | 'observatory' | 'salon' | 'teachers' | 'library' | 'quote' | 'contact'
export const siteThemes = [
  { key: 'olive', label: 'ورقي دافئ', note: 'الهوية الأصلية: ورق عتيق وحبر طيني', swatches: ['#f7f1e6', '#944b38', '#42352e'] },
  { key: 'ink', label: 'حبر أزرق', note: 'هادئ وأكاديمي لقراءة طويلة', swatches: ['#f2f4f6', '#2f5d86', '#243746'] },
  { key: 'sage', label: 'زيتوني', note: 'أخضر زيتوني متوازن وقريب من الطبيعة', swatches: ['#f3f3ec', '#546a2e', '#343a2a'] },
] as const
export type SiteTheme = typeof siteThemes[number]['key']
export type SiteSettings = {
  heroTitle: string; heroSubtitle: string; heroImage: string; heroImageAlt: string;
  quote: string; quoteSource: string; contactTitle: string;
  email: string; tiktok: string; whatsapp: string;
  showEmail: boolean; showTiktok: boolean; showWhatsapp: boolean;
  newsletterUrl?:string; theme: SiteTheme; sections: { key: SectionKey; label: string; visible: boolean }[];
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
    { key: 'teachers', label: 'مجلس التعلّم', visible: true }, { key: 'library', label: 'مكتبة الكتب', visible: true },
    { key: 'quote', label: 'فكرة للتأمل', visible: true }, { key: 'contact', label: 'تواصل', visible: true },
  ],
}
// Sections added after launch. Stored settings may predate them, so they are
// optional in validation and inserted next to their default neighbour on read.
export const laterSections:SectionKey[]=['library','teachers']
export function withLibrary(site:SiteSettings):SiteSettings{
 let sections=[...site.sections]
 for(const key of laterSections){
  if(sections.some(s=>s.key===key))continue
  const fallback=defaultSite.sections.find(d=>d.key===key)!
  const order=defaultSite.sections.map(d=>d.key)
  // Insert before the first existing section that follows it in the default order.
  const after=order.slice(order.indexOf(key)+1)
  const index=sections.findIndex(s=>after.includes(s.key))
  sections=[...sections.slice(0,index<0?sections.length:index),{...fallback},...sections.slice(index<0?sections.length:index)]
 }
 return sections.length===site.sections.length?site:{...site,sections}
}
export function validSite(value: unknown): value is SiteSettings {
  if (!value || typeof value !== 'object') return false
  const s = value as SiteSettings
  const str = (v: unknown, max: number) => typeof v === 'string' && v.length <= max
  const image = (v: unknown) => typeof v === 'string' && (/^\/images\/[^\s]+$/.test(v) || (() => { try { const url = new URL(v); return v.length <= 2000 && url.protocol === 'https:' && !url.username && !url.password && ![...v].some(c => c.charCodeAt(0) <= 32) } catch { return false } })())
  return (s.newsletterUrl===undefined||s.newsletterUrl===''||(/^https:\/\//.test(s.newsletterUrl)&&image(s.newsletterUrl))) && str(s.heroTitle, 300) && Boolean(s.heroTitle.trim()) && str(s.heroSubtitle, 1000) && image(s.heroImage) && str(s.heroImageAlt, 500) && str(s.quote, 1500) && str(s.quoteSource, 500) && str(s.contactTitle, 300) && str(s.email, 254) && (!s.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) && str(s.tiktok, 24) && (!s.tiktok || /^[a-zA-Z0-9_.]{1,24}$/.test(s.tiktok)) && str(s.whatsapp, 15) && (!s.whatsapp || /^[1-9][0-9]{6,14}$/.test(s.whatsapp)) && [s.showEmail, s.showTiktok, s.showWhatsapp].every(v => typeof v === 'boolean') && siteThemes.some(t => t.key === s.theme) && Array.isArray(s.sections) && s.sections.length >= defaultSite.sections.length - laterSections.length && s.sections.length <= defaultSite.sections.length && defaultSite.sections.filter(d=>!laterSections.includes(d.key)).every(d=>s.sections.some(v=>v?.key===d.key)) && s.sections.every(v => v && defaultSite.sections.some(d => d.key === v.key) && str(v.label, 60) && typeof v.visible === 'boolean') && new Set(s.sections.map(v => v.key)).size === s.sections.length && s.sections.some(v => v.visible)
}
