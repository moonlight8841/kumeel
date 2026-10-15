import { useEffect, useState } from 'react'
import { initialContent } from './content'
import {validOwnerDraft as validContent,type OwnerDraft as Content} from './lib/translations'
import {resolvePublishedTranslations} from './lib/localized-content'
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
 useEffect(() => { let active=true;try { const saved = localStorage.getItem('kumeel-journal-v1'); if (saved) { const parsed: unknown = JSON.parse(saved); if (validContent(parsed)) { if(startingPath==='/admin'){setContent(parsed);setDraft(true)}else void resolvePublishedTranslations(parsed).then(next=>{if(active){setContent(next);setDraft(true)}}) } } } catch { setNotice('تعذّر تحميل المسودة المحفوظة.') }return()=>{active=false} }, [startingPath])
 useEffect(() => { if(startingPath!=='/admin'&&document.getElementById('kumeel-content'))return; let active = true; readPublished().then(result => { if (!active) return; setRevision(result.revision); let hasDraft = false; try { hasDraft = validContent(JSON.parse(localStorage.getItem('kumeel-journal-v1') || 'null')) } catch { /* Invalid local data must not hide a published update. */ } if (!hasDraft) setContent(result.content) }).catch(() => { if (active) setNotice('تعذّر تحديث النسخة المنشورة؛ نعرض آخر نسخة متاحة.') }); return () => { active = false } }, [startingPath])
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
 function save(next: Content) { if (!validContent(next)) { setNotice('المحتوى غير صالح أو تجاوز حدود الدفتر. راجع الحقول والروابط.'); return false } try { localStorage.setItem('kumeel-journal-v1', JSON.stringify(next)); setContent(next); setDraft(true); setNotice('حُفظت المسودة على هذا المتصفح.'); return true } catch { setNotice('لم يتم الحفظ؛ مساحة المتصفح غير كافية. صدّر نسخة من محتواك.'); return false } }
 const site = withLibrary(content.site ?? defaultSite)
 if(resolveLocalePath(startingPath).locale==='en')return <div className={`site-shell theme-${site.theme}`}><EnglishPages content={visibleContent} pathname={startingPath}/><div lang="ar" dir="rtl"><ReaderChat/></div></div>
 if (page.kind === 'admin') return <AdminPanel content={content} revision={revision} draft={draft} onSave={save} onPublish={(next, version) => { setContent(next); setRevision(version); setDraft(false); try { localStorage.removeItem('kumeel-journal-v1') } catch { /* Published state is authoritative. */ } }} />
 if (page.kind !== 'home') return <div className={`site-shell theme-${site.theme}`}><PublicationPage content={visibleContent} info={page} /><ReaderChat/>{draft && <div className="draft-banner">تُعرض مسودتك المحلية · لم تُنشر على الإنترنت</div>}</div>
 return <div className={`site-shell theme-${site.theme}`}><HomeShowcase content={visibleContent}/><ReaderChat/>{draft&&<div className="draft-banner">تُعرض مسودتك المحلية · لم تُنشر على الإنترنت</div>}<div role="status" className={notice?'toast':''} onClick={()=>setNotice('')}>{notice}</div></div>
}
export default App
