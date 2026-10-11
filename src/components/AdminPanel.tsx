import {CommunityReview} from './CommunityReview'
import {IdeaEngine} from './IdeaEngine'
import { useState } from 'react'
import { validContent, type Content } from '../content'
import {NotebookEditor} from './NotebookEditor'
import { defaultSite, withLibrary, type SiteSettings } from '../site'
import { BookEditor } from './BookEditor'
import { LearningEditor } from './LearningEditor'
import { CloudPanel } from './CloudPanel'
import {ReadingMode} from './ReadingMode'
import { ThoughtEditor } from './ThoughtEditor'

type Props = { content: Content; revision: number | null; onSave: (content: Content) => boolean; onPublish: (content: Content, revision: number) => void }
export function AdminPanel({ content, revision, onSave, onPublish }: Props) {
 const [authorized, setAuthorized] = useState(false)
 const [local, setLocal] = useState(false)
 const [tab, setTab] = useState('settings')
 const [message, setMessage] = useState('')
 const [notebookDirty, setNotebookDirty] = useState(false)
 const [undo, setUndo] = useState<Content | null>(null)
 const allowed = authorized || (import.meta.env.DEV && local)
 function commit(next: Content) { if (!allowed || !validContent(next) || !onSave(next)) { setMessage('لم يتم الحفظ. راجع الحقول والروابط وحجم المحتوى.'); return false } setUndo(null); setMessage('حُفظت المسودة. راجعها قبل النشر العام.'); return true }
 const tabs = [['community','مراجعة المجتمع'],['engine','مصنع الأفكار'],['settings','الهوية والتصميم'],['writings','الكتابات'],['thoughts','الأفكار والوسائط واللقاءات'],['learning','المحتوى التعليمي'],['library','ترتيب المكتبة'],['books','\u0645\u0643\u062a\u0628\u0629 \u0627\u0644\u0643\u062a\u0628'],['backup','النسخ الاحتياطية']]
 return <div className="admin-shell" dir="rtl"><header className="admin-header"><ReadingMode/><a className="wordmark" href="/">كميل<span>.</span></a><a href="/">معاينة الموقع ↗</a></header><div className="admin-layout"><aside><span className="section-label">مساحة المالك</span><h1>لوحة الإدارة</h1><p>من الفكرة إلى أثرها.</p>{allowed && <nav aria-label="أقسام الإدارة">{tabs.map(([key,label]) => <button key={key} aria-pressed={tab===key} onClick={() => setTab(key)}>{label}</button>)}</nav>}</aside><main className="editor admin-main"><CloudPanel content={content} revision={revision} onLoad={commit} onPublish={onPublish} onAuthorizationChange={setAuthorized} hasUnsavedChanges={notebookDirty} />
 {!authorized && import.meta.env.DEV && <div className="admin-local"><p>التجربة المحلية تحفظ على هذا المتصفح. النشر السحابي يحتاج حسابًا مخوّلًا.</p><button onClick={() => setLocal(!local)}>{local ? 'إغلاق التجربة المحلية' : 'فتح تجربة الإدارة المحلية'}</button></div>}
 {!allowed ? <p>سجّل الدخول بحساب يملك صلاحية الإدارة لفتح أدوات التحرير. تسجيل الحساب وحده لا يمنح صلاحيات.</p> : <>
 {tab==='community'&&authorized&&<CommunityReview/>}
 {tab==='engine'&&<IdeaEngine content={content} save={commit}/>}
 {tab==='settings' && <Settings key={JSON.stringify(content.site)} content={content} save={commit} />}
 {tab==='thoughts' && <ThoughtEditor content={content} onSave={commit} />}
 {tab==='writings' && <NotebookEditor content={content} save={commit} onDirtyChange={setNotebookDirty}/>}
 {tab==='learning' && <LearningEditor content={content} save={commit} />}
 {tab==='books' && <BookEditor content={content} save={commit}/>}
 {tab==='library' && <><h2>ترتيب المكتبة</h2><p>إزالة العنصر تزيل صفحته من النسخة التالية. احتفظ بنسخة احتياطية قبل النشر.</p>{(['writings','ideas','media','sessions'] as const).map(key=><section key={key}><h3>{{writings:'الكتابات',ideas:'الأفكار',media:'الوسائط',sessions:'اللقاءات'}[key]}</h3>{(content[key]??[]).map((item,index,items)=><div className="admin-row" key={item.id}><span>{item.title}</span><button disabled={index===0} onClick={()=>{const list=[...items];[list[index-1],list[index]]=[list[index],list[index-1]];commit({...content,[key]:list})}}>↑</button><button disabled={index===items.length-1} onClick={()=>{const list=[...items];[list[index+1],list[index]]=[list[index],list[index+1]];commit({...content,[key]:list})}}>↓</button><button onClick={()=>{if(commit({...content,[key]:items.filter(i=>i.id!==item.id)}))setUndo(content)}}>إزالة</button></div>)}</section>)}{undo&&<button onClick={()=>{if(commit(undo))setUndo(null)}}>تراجع عن آخر إزالة</button>}</>}
 {tab==='backup' && <><h2>النسخ الاحتياطية</h2><button onClick={()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(content,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='kumeel-content.json';a.click();URL.revokeObjectURL(url)}}>تصدير النسخة الحالية ↓</button><label>استيراد نسخة<input type="file" accept=".json,application/json" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(file.size>4000000)throw Error();const next:unknown=JSON.parse(await file.text());if(!validContent(next))throw Error();if(commit(next))setUndo(content)}catch{setMessage('ملف غير صالح أو أكبر من الحد المسموح.')}}}/></label></>}
 </>}<p role="status">{message}</p></main></div></div>
}
function Settings({content,save}:{content:Content;save:(next:Content)=>boolean}) {
 const [site,setSite]=useState<SiteSettings>(withLibrary(content.site??defaultSite))
 const textFields:[keyof SiteSettings,string][]=[['heroTitle','عنوان الواجهة'],['heroSubtitle','وصف الواجهة'],['heroImage','رابط صورة الواجهة'],['heroImageAlt','وصف الصورة'],['quote','فكرة للتأمل'],['quoteSource','مصدر الفكرة'],['contactTitle','عنوان التواصل'],['email','البريد العام'],['tiktok','اسم تيك توك'],['whatsapp','واتساب بالصيغة الدولية دون +']]
 return <form onSubmit={e=>{e.preventDefault();save({...content,site,bio:String(new FormData(e.currentTarget).get('bio')).trim()})}}><h2>الهوية والتصميم</h2><label>نبذة كميل<textarea name="bio" defaultValue={content.bio} required maxLength={10000}/></label><label>رابط نموذج الاشتراك البريدي<input type="url" maxLength={2000} placeholder="https://" value={site.newsletterUrl??''} onChange={e=>setSite({...site,newsletterUrl:e.target.value.trim()})}/></label><p className="sample-note">أضف رابط نموذج خدمة تدعم تأكيد البريد وإلغاء الاشتراك. الإرسال والتنبيهات تُضبط لدى خدمة البريد. لا تضع مفاتيح API هنا.</p>{textFields.map(([key,label])=><label key={key}>{label}<textarea value={String(site[key])} onChange={e=>setSite({...site,[key]:e.target.value})}/></label>)}<label>المظهر<select value={site.theme} onChange={e=>setSite({...site,theme:e.target.value as SiteSettings['theme']})}><option value="olive">زيتوني وورقي</option><option value="ink">حبر أزرق</option></select></label>{(['showWhatsapp','showEmail','showTiktok'] as const).map(key=><label className="admin-check" key={key}><input type="checkbox" checked={site[key]} onChange={e=>setSite({...site,[key]:e.target.checked})}/>{{showWhatsapp:'إظهار واتساب',showEmail:'إظهار البريد',showTiktok:'إظهار تيك توك'}[key]}</label>)}<h3>أقسام الرئيسية وترتيبها</h3><p>إخفاء قسم من الرئيسية لا يحذف صفحته المستقلة.</p>{site.sections.map((s,i)=><div className="admin-row" key={s.key}><label className="admin-check"><input type="checkbox" checked={s.visible} onChange={e=>setSite({...site,sections:site.sections.map(v=>v.key===s.key?{...v,visible:e.target.checked}:v)})}/>{s.label}</label><button type="button" disabled={i===0} onClick={()=>{const list=[...site.sections];[list[i-1],list[i]]=[list[i],list[i-1]];setSite({...site,sections:list})}}>↑</button><button type="button" disabled={i===site.sections.length-1} onClick={()=>{const list=[...site.sections];[list[i+1],list[i]]=[list[i],list[i+1]];setSite({...site,sections:list})}}>↓</button></div>)}<button className="primary">حفظ الهوية والتصميم</button></form>
}
