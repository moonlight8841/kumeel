import { useCallback, useEffect, useRef, useState } from 'react'
import { initialContent } from './content'
import {validOwnerDraft as validContent,type OwnerDraft as Content} from './lib/translations'
import {readOwnerDraft,writeOwnerDraft,clearOwnerDraft} from './lib/draft-storage'
import {resolveLocalePath} from './lib/i18n'
import {EnglishPages} from './components/EnglishPages'
import './styles/languages.css'
import './styles/tokens.css'
import './App.css'
import './platform.css'
import './identity.css'
import './styles/system.css'
import './styles/admin.css'
import './styles/lab.css'
import './styles/chat.css'
import './styles/salon.css'
import './styles/teachers.css'
import { AdminPanel } from './components/AdminPanel'
import { defaultSite, withLibrary } from './site'
import { PublicationPage } from './components/PublicationPage'
import { pageInfo, structuredData,alternateLinks,openGraphLocale } from './lib/pages'
import { readPublished } from './lib/cloud'
import {HomeShowcase} from './components/HomeShowcase'
import {ReaderChat} from './components/ReaderChat'
import {readerContent} from './lib/publication'
function App({ startingContent = initialContent, startingPath = '/' }: { startingContent?: Content; startingPath?: string }) {
 const [content, setContent] = useState<Content>(startingContent)
 const [notice, setNotice] = useState('')
 const [draft, setDraft] = useState(false)
 const [revision, setRevision] = useState<number | null>(null)
 const published=useRef<Content>(startingContent)
 const owner=useRef<string|null>(null)
 const hasPrivateDraft=useRef(false)
 const [legacyDraftAvailable,setLegacyDraftAvailable]=useState(false)
 const ownerChanged=useCallback((id:string|null)=>{
  if(owner.current===id)return
  if(owner.current)try{clearOwnerDraft(owner.current)}catch{/* Clear in-memory state even if storage fails. */}
  owner.current=id;hasPrivateDraft.current=false;setDraft(false);setContent(published.current)
  setLegacyDraftAvailable(false)
  if(!id)return
  try{const saved=readOwnerDraft(id);if(validContent(saved)){setContent(saved);setDraft(true);hasPrivateDraft.current=true}setLegacyDraftAvailable(Boolean(localStorage.getItem('kumeel-journal-v1')))}catch{setNotice('تعذّر تحميل المسودة الخاصة بهذا التبويب.')}
 },[])
 useEffect(()=>{
  if(startingPath!=='/admin'&&document.getElementById('kumeel-content'))return
  let active=true
  readPublished().then(result=>{if(!active)return;published.current=result.content;setRevision(result.revision);if(!hasPrivateDraft.current)setContent(result.content)}).catch(()=>{if(active)setNotice('تعذّر تحديث النسخة المنشورة. تحقق من الاتصال.')})
  return()=>{active=false}
 },[startingPath])
 const visibleContent = startingPath === '/admin' ? content : readerContent(content)
 const page = pageInfo(visibleContent, startingPath)
 useEffect(() => {
   const info = pageInfo(startingPath === '/admin' ? content : readerContent(content), startingPath)
   document.title = info.title
   const locale=resolveLocalePath(startingPath).locale
   document.documentElement.lang=locale
   document.documentElement.dir=locale==='en'?'ltr':'rtl'
   const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
   const origin = canonical ? new URL(canonical.href).origin : ''
   const pairs=draft?[]:alternateLinks(readerContent(content),info.path,origin)
   const og=openGraphLocale(info.path,pairs.length>0)
   const tags = [['name', 'description', info.description], ['name', 'robots', info.noindex || draft ? 'noindex, follow' : 'index, follow'], ['property', 'og:title', info.title], ['property', 'og:description', info.description], ['property', 'og:type', info.idea || info.writing ? 'article' : 'website'], ['property', 'og:site_name', og.siteName], ['property', 'og:locale', og.locale]]
   document.head.querySelector('meta[property="og:locale:alternate"]')?.remove()
   if(og.alternate)tags.push(['property','og:locale:alternate',og.alternate])
   for (const [attribute, name, value] of tags) {
     let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`)
     if (!tag) { tag = document.createElement('meta'); tag.setAttribute(attribute, name); document.head.append(tag) }
     tag.content = value
   }
   let schema = document.getElementById('kumeel-schema')
   if (!schema) { schema = document.createElement('script'); schema.setAttribute('type', 'application/ld+json'); schema.id = 'kumeel-schema'; document.head.append(schema) }
   if(canonical)canonical.href=origin+info.path
   document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(tag=>tag.remove())
   for(const [language,href] of pairs){const link=document.createElement('link');link.rel='alternate';link.hreflang=language;link.href=href;document.head.append(link)}
   schema.textContent = JSON.stringify(structuredData(content, info, origin))
 }, [content, startingPath, draft])
 function save(next:Content){
  if(startingPath!=='/admin'||!validContent(next)){setNotice('تعذّر حفظ المسودة. تحقق من الصلاحية وصحة المحتوى.');return false}
  const id=owner.current??(import.meta.env.DEV?'development-preview':null)
  if(!id){setNotice('سجّل الدخول بحساب مخوّل لحفظ المسودة.');return false}
  try{writeOwnerDraft(id,next);setContent(next);setDraft(true);hasPrivateDraft.current=true;setNotice('حُفظت المسودة في هذا التبويب. احفظها سحابيًا للاحتفاظ بها بعد إغلاقه.');return true}catch{setNotice('تعذّر حفظ المسودة في التبويب. صدّر نسخة قبل المغادرة.');return false}
 }
 function importLegacy(){
  if(!owner.current||!window.confirm('ستحل المسودة القديمة محل المسودة الحالية لحسابك في هذا التبويب. هل تريد نقلها؟'))return
  try{const next:unknown=JSON.parse(localStorage.getItem('kumeel-journal-v1')??'null');if(validContent(next)&&save(next)){setLegacyDraftAvailable(false)}else setNotice('المسودة القديمة غير صالحة. لم تُحذف.')}catch{setNotice('تعذّر نقل المسودة القديمة. لم تُحذف.')}
 }
 function deleteLegacy(){
  if(!owner.current||!window.confirm('احفظ أو صدّر نسخة احتياطية أولًا. هل تريد حذف المسودة القديمة من هذا المتصفح؟'))return
  try{localStorage.removeItem('kumeel-journal-v1');setLegacyDraftAvailable(false)}catch{setNotice('تعذّر حذف النسخة القديمة.')}
 }
 const site = withLibrary(content.site ?? defaultSite)
 if(resolveLocalePath(startingPath).locale==='en')return <div className={`site-shell theme-${site.theme}`}><EnglishPages content={visibleContent} pathname={startingPath}/><div lang="ar" dir="rtl"><ReaderChat/></div></div>
 if (page.kind === 'admin') return <AdminPanel onOwnerChange={ownerChanged} legacyDraftAvailable={legacyDraftAvailable} onImportLegacy={importLegacy} onDeleteLegacy={deleteLegacy} content={content} revision={revision} draft={draft} onSave={save} onPublish={(next, version) => { published.current=next;hasPrivateDraft.current=false;setContent(next);setRevision(version);setDraft(false);if(owner.current)try{clearOwnerDraft(owner.current)}catch{/* Published content remains authoritative. */} }} />
 if (page.kind !== 'home') return <div className={`site-shell theme-${site.theme}`}><PublicationPage content={visibleContent} info={page} /><ReaderChat/>{draft && <div className="draft-banner">تُعرض مسودتك المحلية · لم تُنشر على الإنترنت</div>}</div>
 return <div className={`site-shell theme-${site.theme}`}><HomeShowcase content={visibleContent}/><ReaderChat/>{draft&&<div className="draft-banner">تُعرض مسودتك المحلية · لم تُنشر على الإنترنت</div>}<div role="status" className={notice?'toast':''} onClick={()=>setNotice('')}>{notice}</div></div>
}
export default App
