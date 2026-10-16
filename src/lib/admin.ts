import type {Content} from '../content'
import {defaultSite} from '../site'
import {booksFor} from '../books'
import {isStarterWriting} from './publication'

const n=(value:number)=>value.toLocaleString('ar-SA')
export type AdminTab='sparring'|'teachers'|'overview'|'writings'|'thoughts'|'learning'|'books'|'community'|'engine'|'assist'|'settings'|'arrange'|'publish'|'backup'
export type AdminNavItem={key:AdminTab;label:string;icon:string;hint:string;ownerOnly?:boolean}
export type AdminNavGroup={label:string;items:AdminNavItem[]}

// Grouped by the owner's workflow: see state → write → moderate → shape the site → ship.
export const adminNav:AdminNavGroup[]=[
 {label:'البداية',items:[{key:'overview',label:'نظرة عامة',icon:'◎',hint:'حالة المحتوى وما يحتاج انتباهك'}]},
 {label:'المحتوى',items:[
  {key:'writings',label:'الكتابات',icon:'✎',hint:'دفتر الكتابة والمعاينة'},
  {key:'sparring',label:'المحاور',icon:'⚖',hint:'اختبر كتاباتك أمام اعتراض قوي، وانشر ما تختار',ownerOnly:true},
  {key:'thoughts',label:'الأفكار واللقاءات',icon:'◇',hint:'المرصد والوسائط ومجلس الحوار'},
  {key:'learning',label:'المحتوى التعليمي',icon:'◈',hint:'مقالات الاكتشاف وأسئلة التحدّي'},
  {key:'books',label:'مكتبة الكتب',icon:'▤',hint:'الكتب وملفاتها وترتيبها'},
 ]},
 {label:'الإبداع والمجتمع',items:[
  {key:'community',label:'مراجعة المجتمع',icon:'☰',hint:'مساهمات الأعضاء قبل النشر',ownerOnly:true},
  {key:'teachers',label:'مجلس التعلّم',icon:'❖',hint:'مراجعة طلبات المعلمين واعتماد صفحاتهم',ownerOnly:true},
  {key:'engine',label:'مصنع الأفكار',icon:'✦',hint:'توليد مسودات أفكار جديدة'},
  {key:'assist',label:'مساعد التحرير',icon:'✧',hint:'تدقيق ووصف صور وملخصات وأسئلة — اقتراحات تراجعها قبل الحفظ'},
 ]},
 {label:'الموقع',items:[
  {key:'settings',label:'الهوية والتصميم',icon:'◐',hint:'الواجهة والمظهر وأقسام الرئيسية'},
  {key:'arrange',label:'ترتيب المحتوى',icon:'⇅',hint:'ترتيب العناصر وإزالتها'},
 ]},
 {label:'النظام',items:[
  {key:'publish',label:'النشر والحساب',icon:'↑',hint:'المسودات السحابية والنشر العام'},
  {key:'backup',label:'النسخ الاحتياطية',icon:'⇩',hint:'تصدير المحتوى واستيراده'},
 ]},
]

export const adminTabs=adminNav.flatMap(g=>g.items)
// Old bookmarks used `library` for the ordering screen.
const aliases:Record<string,AdminTab>={library:'arrange'}
export function parseAdminTab(hash:string):AdminTab|null{
 const key=decodeURIComponent(hash.replace(/^#/,'')).trim()
 const tab=aliases[key]??key
 return adminTabs.some(t=>t.key===tab)?tab as AdminTab:null
}

export type AdminStat={label:string;value:number;tab:AdminTab;detail?:string}
export function contentStats(content:Content,now:number):AdminStat[]{
 const sessions=content.sessions??[]
 const upcoming=sessions.filter(s=>!s.cancelled&&Date.parse(s.startsAt)+s.durationMinutes*60000>now).length
 const books=booksFor(content)
 return [
  {label:'كتابات',value:content.writings.length,tab:'writings'},
  {label:'أفكار في المرصد',value:content.ideas?.length??0,tab:'thoughts'},
  {label:'وسائط',value:content.media.length,tab:'thoughts'},
  {label:'لقاءات قادمة',value:upcoming,tab:'thoughts',detail:`من ${n(sessions.length)} في الأرشيف`},
  {label:'كتب',value:books.length,tab:'books',detail:`${n(books.filter(b=>b.featured).length)} مختارة`},
  {label:'مواد تعليمية',value:(content.discoveries?.length??0)+(content.quiz?.length??0),tab:'learning'},
 ]
}

export type HealthLevel='warning'|'info'
export type HealthIssue={id:string;level:HealthLevel;title:string;detail:string;tab:AdminTab}
// Checks that affect readers (accessibility, trust, reachability), ordered by severity.
export function contentHealth(content:Content,now:number):HealthIssue[]{
 const site=content.site??defaultSite
 const issues:HealthIssue[]=[]
 const add=(issue:HealthIssue)=>issues.push(issue)
 if(!site.heroImageAlt.trim())add({id:'hero-alt',level:'warning',title:'صورة الواجهة بلا وصف',detail:'أضف وصفًا نصيًا لقرّاء الشاشة ومحركات البحث.',tab:'settings'})
 const images=content.media.filter(m=>m.type==='صورة'&&!m.description?.trim())
 if(images.length)add({id:'media-alt',level:'warning',title:`${n(images.length)} صور بلا وصف`,detail:'الوصف يجعل الصور مفهومة لمن لا يراها. يقترح مساعد التحرير وصفًا تراجعه.',tab:'assist'})
 const unsourced=(content.ideas??[]).filter(i=>!i.sample&&!i.source?.trim()&&!i.sourceUrl?.trim())
 if(unsourced.length)add({id:'idea-source',level:'warning',title:`${n(unsourced.length)} أفكار بلا مصدر`,detail:'ذكر المصدر أو السياق يعزّز ثقة القارئ.',tab:'thoughts'})
 const samples=(content.ideas??[]).filter(i=>i.sample)
 if(samples.length)add({id:'idea-sample',level:'info',title:`${n(samples.length)} أفكار تجريبية في الدفتر`,detail:'مخفية عن الزوار. استبدلها بأفكار معتمدة قبل إتاحتها.',tab:'thoughts'})
 const starters=content.writings.filter(isStarterWriting)
 if(starters.length)add({id:'writing-starter',level:'warning',title:`${n(starters.length)} كتابات تمهيدية تحتاج الاستبدال`,detail:'محفوظة للتحرير ومخفية عن الزوار؛ أضف كتاباتك الفعلية.',tab:'writings'})
 if(!content.writings.some(w=>!isStarterWriting(w))&&!(content.ideas??[]).some(i=>!i.sample))add({id:'original-content',level:'warning',title:'أضف أول مادة معتمدة',detail:'الجاهزية التقنية لا تعوّض المحتوى. انشر كتابة أو فكرة راجعتها واعتمدتها.',tab:'writings'})
 if(![site.showEmail&&site.email,site.showTiktok&&site.tiktok,site.showWhatsapp&&site.whatsapp].some(Boolean))add({id:'contact',level:'warning',title:'لا توجد وسيلة تواصل ظاهرة',detail:'فعّل وسيلة واحدة على الأقل ليصل إليك القرّاء.',tab:'settings'})
 const pastNoSummary=(content.sessions??[]).filter(s=>!s.cancelled&&Date.parse(s.startsAt)+s.durationMinutes*60000<=now&&!s.summary?.trim()&&!s.recordingUrl?.trim())
 if(pastNoSummary.length)add({id:'session-summary',level:'info',title:`${n(pastNoSummary.length)} لقاءات منتهية بلا ملخص أو تسجيل`,detail:'الملخص يحوّل اللقاء إلى أثر يقرؤه من فاته. يلخّص المساعد ملاحظاتك.',tab:'assist'})
 const undated=content.writings.filter(w=>!w.publishedAt)
 if(undated.length)add({id:'writing-date',level:'info',title:`${n(undated.length)} كتابات بلا تاريخ نشر`,detail:'التاريخ يرتّب الكتابات من الأحدث إلى الأقدم.',tab:'writings'})
 if(!site.newsletterUrl)add({id:'newsletter',level:'info',title:'النشرة البريدية غير مفعّلة',detail:'أضف رابط نموذج الاشتراك ليصل جديدك إلى القرّاء.',tab:'settings'})
 if(content.bio.trim().length<80)add({id:'bio',level:'info',title:'النبذة قصيرة',detail:'نبذة من سطرين أو ثلاثة تعرّف الزائر بالمساحة.',tab:'settings'})
 return issues.sort((a,b)=>Number(a.level==='info')-Number(b.level==='info'))
}

export function backupFileName(date=new Date()){return `kumeel-content-${date.toISOString().slice(0,10)}.json`}
