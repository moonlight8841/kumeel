import {useEffect,useState,type ReactNode} from 'react'
import type {Content} from '../../content'
import {defaultSite,siteThemes,validSite,withLibrary,type SiteSettings} from '../../site'

type Props={content:Content;save:(next:Content)=>boolean;onDirtyChange:(dirty:boolean)=>void}

function Field({label,hint,children}:{label:string;hint?:string;children:ReactNode}){return <label className="admin-field"><span className="admin-field-label">{label}</span>{children}{hint&&<small>{hint}</small>}</label>}

export function AdminSettings({content,save,onDirtyChange}:Props){
 const initial=withLibrary(content.site??defaultSite)
 const [site,setSite]=useState<SiteSettings>(initial)
 const [bio,setBio]=useState(content.bio)
 const [error,setError]=useState('')
 const dirty=JSON.stringify(site)!==JSON.stringify(initial)||bio!==content.bio
 useEffect(()=>{onDirtyChange(dirty)},[dirty,onDirtyChange])
 useEffect(()=>()=>onDirtyChange(false),[onDirtyChange])
 const set=<K extends keyof SiteSettings>(key:K,value:SiteSettings[K])=>{setSite(s=>({...s,[key]:value}));setError('')}
 function move(index:number,delta:number){setSite(s=>{const list=[...s.sections];const target=index+delta;if(target<0||target>=list.length)return s;[list[index],list[target]]=[list[target],list[index]];return {...s,sections:list}})}
 function submit(){
  if(!bio.trim()){setError('النبذة مطلوبة.');return}
  if(!validSite(site)){setError('بعض الحقول غير صالحة: تحقق من روابط الصور (https أو /images/)، والبريد، وواتساب بالأرقام فقط، وأن قسمًا واحدًا على الأقل ظاهر.');return}
  if(save({...content,site,bio:bio.trim()}))setError('')
 }
 const visibleCount=site.sections.filter(s=>s.visible).length
 return <form className="admin-form admin-settings" onSubmit={e=>{e.preventDefault();submit()}} noValidate>
  <fieldset className="admin-card"><legend>النبذة</legend>
   <Field label="نبذة كميل" hint="تظهر في صفحة «عن كميل» وقسم «من هو كميل؟» في الرئيسية."><textarea rows={5} value={bio} onChange={e=>{setBio(e.target.value);setError('')}} required maxLength={10000}/></Field>
  </fieldset>

  <fieldset className="admin-card"><legend>واجهة الصفحة الرئيسية</legend>
   <div className="admin-field-grid">
    <Field label="عنوان الواجهة" hint="سطر جديد = كسر سطر في العنوان."><textarea rows={2} value={site.heroTitle} maxLength={300} onChange={e=>set('heroTitle',e.target.value)}/></Field>
    <Field label="وصف الواجهة"><textarea rows={3} value={site.heroSubtitle} maxLength={1000} onChange={e=>set('heroSubtitle',e.target.value)}/></Field>
   </div>
   <div className="admin-image-field">
    <div className="admin-image-preview">{site.heroImage?<img src={site.heroImage} alt="" loading="lazy"/>:<span>لا صورة</span>}</div>
    <div>
     <Field label="رابط صورة الواجهة" hint="رابط https أو مسار يبدأ بـ /images/"><input dir="ltr" value={site.heroImage} maxLength={2000} onChange={e=>set('heroImage',e.target.value.trim())}/></Field>
     <Field label="وصف الصورة" hint="لقرّاء الشاشة ومحركات البحث."><input value={site.heroImageAlt} maxLength={500} onChange={e=>set('heroImageAlt',e.target.value)}/></Field>
    </div>
   </div>
  </fieldset>

  <fieldset className="admin-card"><legend>فكرة للتأمل</legend>
   <Field label="نص الفكرة"><textarea rows={3} value={site.quote} maxLength={1500} onChange={e=>set('quote',e.target.value)}/></Field>
   <Field label="مصدر الفكرة"><input value={site.quoteSource} maxLength={500} onChange={e=>set('quoteSource',e.target.value)}/></Field>
  </fieldset>

  <fieldset className="admin-card"><legend>التواصل والنشرة</legend>
   <Field label="عنوان قسم التواصل"><input value={site.contactTitle} maxLength={300} onChange={e=>set('contactTitle',e.target.value)}/></Field>
   <div className="admin-channels">
    {([['email','showEmail','البريد العام','email','name@example.com'],['whatsapp','showWhatsapp','واتساب (بالصيغة الدولية دون +)','tel','966500000000'],['tiktok','showTiktok','اسم تيك توك','text','username']] as const).map(([key,toggle,label,type,placeholder])=><div className="admin-channel" key={key}>
     <Field label={label}><input dir="ltr" type={type} inputMode={key==='whatsapp'?'numeric':undefined} placeholder={placeholder} value={site[key]} onChange={e=>set(key,e.target.value.trim())}/></Field>
     <label className="admin-switch"><input type="checkbox" checked={site[toggle]} onChange={e=>set(toggle,e.target.checked)}/><span>{site[toggle]?'ظاهر':'مخفي'}</span></label>
    </div>)}
   </div>
   <Field label="رابط نموذج الاشتراك البريدي" hint="من خدمة تدعم تأكيد البريد وإلغاء الاشتراك. لا تضع مفاتيح API هنا."><input dir="ltr" type="url" maxLength={2000} placeholder="https://" value={site.newsletterUrl??''} onChange={e=>set('newsletterUrl',e.target.value.trim())}/></Field>
  </fieldset>

  <fieldset className="admin-card"><legend>المظهر</legend>
   <p className="admin-muted">لوحة ألوان الموقع للزوار. كل مظهر يأتي بنسخة نهارية وليلية يختارها القارئ.</p>
   <div className="admin-themes" role="radiogroup" aria-label="مظهر الموقع">{siteThemes.map(t=><label key={t.key} className="admin-theme-option" data-selected={site.theme===t.key||undefined}>
    <input type="radio" name="theme" value={t.key} checked={site.theme===t.key} onChange={()=>set('theme',t.key)}/>
    <span className={`admin-theme-sample theme-${t.key}`} aria-hidden="true"><span className="sample-title">عنوان</span><span className="sample-line"/><span className="sample-line short"/><span className="sample-button">زر</span></span>
    <span className="admin-theme-meta"><strong>{t.label}</strong><small>{t.note}</small><span className="admin-swatches">{t.swatches.map(c=><i key={c} style={{background:c}}/>)}</span></span>
   </label>)}</div>
  </fieldset>

  <fieldset className="admin-card"><legend>أقسام الرئيسية وترتيبها</legend>
   <p className="admin-muted">يظهر في الرئيسية {visibleCount.toLocaleString('ar-SA')} من {site.sections.length.toLocaleString('ar-SA')} أقسام بهذا الترتيب. إخفاء القسم لا يحذف صفحته المستقلة. «المرصد» و«المجلس» و«اكتشف» تظهر متجاورة إذا رتّبتها متتالية.</p>
   <ol className="admin-order">{site.sections.map((s,i)=><li key={s.key} data-hidden={!s.visible||undefined}>
    <span className="admin-order-index">{(i+1).toLocaleString('ar-SA')}</span>
    <label className="admin-switch"><input type="checkbox" checked={s.visible} disabled={s.visible&&visibleCount===1} onChange={e=>setSite(v=>({...v,sections:v.sections.map(x=>x.key===s.key?{...x,visible:e.target.checked}:x)}))}/><span className="sr-only">إظهار</span></label>
    <span className="admin-order-label">{s.label}</span>
    <span className="admin-order-actions"><button type="button" className="admin-icon-btn" disabled={i===0} onClick={()=>move(i,-1)} aria-label={`نقل ${s.label} للأعلى`}>↑</button><button type="button" className="admin-icon-btn" disabled={i===site.sections.length-1} onClick={()=>move(i,1)} aria-label={`نقل ${s.label} للأسفل`}>↓</button></span>
   </li>)}</ol>
  </fieldset>

  <div className={`admin-savebar${dirty?' is-dirty':''}`}>
   <span role="status">{error?<span className="admin-error">{error}</span>:dirty?'لديك تغييرات غير محفوظة.':'لا تغييرات جديدة.'}</span>
   <div><button type="button" className="admin-btn" disabled={!dirty} onClick={()=>{setSite(initial);setBio(content.bio);setError('')}}>تراجع</button><button className="admin-btn is-primary" disabled={!dirty}>حفظ الهوية والتصميم</button></div>
  </div>
 </form>
}
