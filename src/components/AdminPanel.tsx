import {CommunityReview} from './CommunityReview'
import {IdeaEngine} from './IdeaEngine'
import {useCallback,useEffect,useState} from 'react'
import {validContent,type Content} from '../content'
import {NotebookEditor} from './NotebookEditor'
import {defaultSite} from '../site'
import {BookEditor} from './BookEditor'
import {LearningEditor} from './LearningEditor'
import {CloudPanel} from './CloudPanel'
import {ReadingMode} from './ReadingMode'
import {ThoughtEditor} from './ThoughtEditor'
import {adminNav,adminTabs,parseAdminTab,type AdminTab} from '../lib/admin'
import {AdminOverview} from './admin/AdminOverview'
import {AdminSettings} from './admin/AdminSettings'
import {AdminArrange} from './admin/AdminArrange'
import {AdminBackup} from './admin/AdminBackup'
import {AdminAssist} from './admin/AdminAssist'

type Props={content:Content;revision:number|null;draft?:boolean;onSave:(content:Content)=>boolean;onPublish:(content:Content,revision:number)=>void}
type Notice={text:string;tone:'success'|'error'|'info'}

export function AdminPanel({content,revision,draft=false,onSave,onPublish}:Props){
 const [authorized,setAuthorized]=useState(false)
 const [local,setLocal]=useState(false)
 const [tab,setTab]=useState<AdminTab>('overview')
 const [notice,setNotice]=useState<Notice|null>(null)
 const [notebookDirty,setNotebookDirty]=useState(false)
 const [settingsDirty,setSettingsDirty]=useState(false)
 const [navOpen,setNavOpen]=useState(false)
 const allowed=authorized||(import.meta.env.DEV&&local)
 const dirty=notebookDirty||settingsDirty
 const site=content.site??defaultSite
 const onAuthorizationChange=useCallback((value:boolean)=>setAuthorized(value),[])

 // The hash keeps the open section across reloads and makes it linkable.
 useEffect(()=>{const sync=()=>{const next=parseAdminTab(location.hash);if(next)setTab(next)};sync();window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync)},[])
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue=''};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[dirty])
 useEffect(()=>{if(!notice||notice.tone==='error')return;const t=setTimeout(()=>setNotice(null),6000);return()=>clearTimeout(t)},[notice])

 function go(next:AdminTab){
  if(next===tab){setNavOpen(false);return}
  if(dirty&&!window.confirm('لديك تغييرات غير محفوظة في هذا القسم. هل تريد المغادرة دون حفظ؟'))return
  setNotebookDirty(false);setSettingsDirty(false)
  setTab(next);setNavOpen(false)
  history.replaceState(null,'',`#${next}`)
  document.getElementById('admin-main')?.focus({preventScroll:true})
  window.scrollTo({top:0})
 }
 function commit(next:Content){
  if(!allowed||!validContent(next)||!onSave(next)){setNotice({tone:'error',text:'لم يتم الحفظ. راجع الحقول والروابط وحجم المحتوى.'});return false}
  setNotice({tone:'success',text:'حُفظت المسودة. راجعها ثم انشرها من «النشر والحساب».'})
  return true
 }
 const current=adminTabs.find(t=>t.key===tab)
 const visibleGroups=adminNav.map(g=>({...g,items:g.items.filter(i=>!i.ownerOnly||authorized)})).filter(g=>g.items.length)

 return <div className={`admin-shell theme-${site.theme}`} dir="rtl">
  <header className="admin-header">
   <div className="admin-brand"><a className="wordmark" href="/">كميل<span>.</span></a><span className="admin-brand-label">لوحة الإدارة</span></div>
   <div className="admin-status" aria-label="حالة المحتوى">
    {allowed&&<span className={`admin-chip ${draft?'is-warning':'is-success'}`}>{draft?'مسودة محلية غير منشورة':'متطابق مع المنشور'}</span>}
    {revision!==null&&<span className="admin-chip">النسخة المنشورة #{revision.toLocaleString('ar-SA')}</span>}
    {dirty&&<span className="admin-chip is-danger">تحرير غير محفوظ</span>}
   </div>
   <div className="admin-header-tools">
    {allowed&&draft&&<button className="admin-btn is-primary" onClick={()=>go('publish')}>مراجعة ونشر</button>}
    <a className="admin-btn" href="/" target="_blank" rel="noopener">معاينة الموقع ↗</a>
    <ReadingMode/>
    {allowed&&<button className="admin-btn admin-nav-toggle" aria-expanded={navOpen} aria-controls="admin-nav" onClick={()=>setNavOpen(!navOpen)}>{navOpen?'✕ إغلاق':'☰ الأقسام'}</button>}
   </div>
  </header>
  <div className="admin-layout">
   <aside className="admin-sidebar">
    {allowed?<nav id="admin-nav" className={navOpen?'open':''} aria-label="أقسام الإدارة">{visibleGroups.map(group=><div className="admin-nav-group" key={group.label}><span className="admin-nav-label">{group.label}</span>{group.items.map(item=><button key={item.key} className="admin-nav-item" aria-current={tab===item.key?'page':undefined} onClick={()=>go(item.key)}><span className="admin-nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span></button>)}</div>)}</nav>
    :<div className="admin-intro"><span className="section-label">مساحة المالك</span><h1>لوحة الإدارة</h1><p>من الفكرة إلى أثرها.</p></div>}
   </aside>
   <main id="admin-main" className="editor admin-main" tabIndex={-1}>
    {allowed&&current&&<div className="admin-page-head"><span className="admin-page-icon" aria-hidden="true">{current.icon}</span><div><h1>{current.label}</h1><p>{current.hint}</p></div></div>}
    <div hidden={allowed&&tab!=='publish'}><CloudPanel content={content} revision={revision} onLoad={commit} onPublish={onPublish} onAuthorizationChange={onAuthorizationChange} hasUnsavedChanges={notebookDirty}/></div>
    {!authorized&&import.meta.env.DEV&&<div className="admin-local"><p>التجربة المحلية تحفظ على هذا المتصفح. النشر السحابي يحتاج حسابًا مخوّلًا.</p><button className="admin-btn" onClick={()=>setLocal(!local)}>{local?'إغلاق التجربة المحلية':'فتح تجربة الإدارة المحلية'}</button></div>}
    {!allowed?<p className="admin-gate">سجّل الدخول بحساب يملك صلاحية الإدارة لفتح أدوات التحرير. تسجيل الحساب وحده لا يمنح صلاحيات.</p>:<div className="admin-panel-body">
     {tab==='overview'&&<AdminOverview content={content} revision={revision} draft={draft} go={go}/>}
     {tab==='community'&&authorized&&<CommunityReview/>}
     {tab==='engine'&&<IdeaEngine content={content} save={commit}/>}
     {tab==='assist'&&<AdminAssist content={content} save={commit}/>}
     {tab==='settings'&&<AdminSettings key={JSON.stringify([content.site,content.bio])} content={content} save={commit} onDirtyChange={setSettingsDirty}/>}
     {tab==='thoughts'&&<ThoughtEditor content={content} onSave={commit}/>}
     {tab==='writings'&&<NotebookEditor content={content} save={commit} onDirtyChange={setNotebookDirty}/>}
     {tab==='learning'&&<LearningEditor content={content} save={commit}/>}
     {tab==='books'&&<BookEditor content={content} save={commit}/>}
     {tab==='arrange'&&<AdminArrange content={content} save={commit}/>}
     {tab==='backup'&&<AdminBackup content={content} save={commit} onError={text=>setNotice({tone:'error',text})}/>}
    </div>}
    <div className={`admin-toast${notice?` is-${notice.tone} is-visible`:''}`} role="status" aria-live="polite">{notice&&<><span>{notice.text}</span><button aria-label="إغلاق الرسالة" onClick={()=>setNotice(null)}>✕</button></>}</div>
   </main>
  </div>
 </div>
}
