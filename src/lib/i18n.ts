export type Locale='ar'|'en'
export type ResolvedRoute={locale:Locale;path:string;supported:boolean}
const englishPath=(path:string)=>['/','/music','/about','/writings','/observatory','/salon','/teachers','/community','/library','/explore','/member'].includes(path)||/^\/(writings|ideas|media|library)\/[^/]+$/.test(path)
export function resolveLocalePath(pathname:string):ResolvedRoute{
 const raw=pathname.split(/[?#]/)[0]
 const normalized=raw.replace(/\/+$/,'')||'/'
 const locale:Locale=normalized==='/en'||normalized.startsWith('/en/')?'en':'ar'
 const path=locale==='en'?(normalized.slice(3)||'/'):normalized
 let valid=false
 // Control characters in decoded segments are rejected deliberately.
 // eslint-disable-next-line no-control-regex
 try{valid=path.startsWith('/')&&!path.startsWith('//')&&!path.includes('\\')&&path.split('/').every(p=>{const d=decodeURIComponent(p);return d!=='.'&&d!=='..'&&!/[/\\\u0000-\u001f]/.test(d)})}catch{valid=false}
 return {locale,path,supported:valid&&(locale==='ar'||englishPath(path))}
}
export function localePath(locale:Locale|string,arabicPath:string):string{
 const route=resolveLocalePath(arabicPath)
 if(route.locale!=='ar'||!route.supported||(locale==='en'&&!englishPath(route.path)))throw new Error('Unsupported localized path')
 return locale==='en'?route.path==='/'?'/en/':`/en${route.path}`:route.path
}
const en={
 owner:'Kumeel Al Nahab',home:'Home',about:'About Kumeel',writings:'Writings',
 language:'Language',arabic:'العربية',english:'English',navigation:'Main navigation',footer:'Footer links',
 tagline:'A space for philosophy, science and dialogue.',hero:'A question awakens thought. A conversation opens horizons.',
 intro:'Read, question and explore ideas together.',read:'Read the writings',learn:'About this space',
 latest:'Published English translations',empty:'No English translations have been published yet.',
 unavailable:'An English translation is not available yet.',original:'Read the Arabic original',
 reviewed:'English translation reviewed by the owner.',back:'All English writings',notFound:'Translation not found',
 menu:'Open menu',closeMenu:'Close menu',skip:'Skip to content',
 arabicSection:'Arabic',community:'Community',library:'Library',salon:'Dialogue salon',
 discover:'Explore',observatory:'Ideas observatory',teachers:'Learning community',
 chatArabic:'The writing assistant currently answers in Arabic.',openArabic:'Browse the Arabic website',
 login:'Sign in (Arabic)',admin:'Administration (Arabic)',switchMissing:'This writing is available in Arabic only.',
 bioEmpty:'The English biography is awaiting review and publication.',
}
type Messages=Record<keyof typeof en,string>
const ar:Messages={
 owner:'كميل ال نهاب',home:'الرئيسية',about:'عن كميل',writings:'الكتابات',
 language:'اللغة',arabic:'العربية',english:'English',navigation:'التنقل الرئيسي',footer:'روابط التذييل',
 tagline:'مساحة للفلسفة والعلم والحوار.',hero:'سؤالٌ يوقظ الفكر، وحوارٌ يفتح الأفق.',intro:'نقرأ ونسأل ونختبر الأفكار معًا.',
 read:'اقرأ الكتابات',learn:'عن هذه المساحة',latest:'الترجمات الإنجليزية المنشورة',empty:'لم تُنشر ترجمات إنجليزية بعد.',
 unavailable:'الترجمة الإنجليزية غير متاحة بعد.',original:'اقرأ الأصل العربي',reviewed:'ترجمة إنجليزية راجعها المالك.',
 back:'كل الكتابات الإنجليزية',notFound:'الترجمة غير موجودة',menu:'فتح القائمة',closeMenu:'إغلاق القائمة',skip:'انتقل إلى المحتوى',
 arabicSection:'بالعربية',community:'المجتمع',library:'المكتبة',salon:'مجلس الحوار',discover:'اكتشف',observatory:'مرصد الأفكار',
 teachers:'مجلس التعلّم',chatArabic:'محاور الكتابات يجيب بالعربية حاليًا.',openArabic:'تصفح الموقع العربي',login:'تسجيل الدخول',
 admin:'لوحة الإدارة',switchMissing:'هذه الكتابة متاحة بالعربية فقط.',bioEmpty:'النبذة الإنجليزية بانتظار المراجعة والنشر.',
}
export const messages:Record<Locale,Messages>={ar,en}
