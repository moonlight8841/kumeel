import {useState} from 'react'
import {validContent,type Content} from '../../content'
import {backupFileName} from '../../lib/admin'

const maxBytes=4_000_000

export function AdminBackup({content,save,onError}:{content:Content;save:(next:Content)=>boolean;onError:(message:string)=>void}){
 const [previous,setPrevious]=useState<Content|null>(null)
 const size=new Blob([JSON.stringify(content)]).size
 function exportCopy(){const url=URL.createObjectURL(new Blob([JSON.stringify(content,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=backupFileName();a.click();URL.revokeObjectURL(url)}
 async function importCopy(file:File){
  try{
   if(file.size>maxBytes)throw new Error('size')
   const next:unknown=JSON.parse(await file.text())
   if(!validContent(next))throw new Error('shape')
   if(!window.confirm('سيحلّ الملف المستورد محل المسودة الحالية على هذا المتصفح. هل تريد المتابعة؟'))return
   const before=content
   if(save(next))setPrevious(before)
  }catch(error){onError(error instanceof Error&&error.message==='size'?'الملف أكبر من الحد المسموح (٤ ميغابايت).':'ملف غير صالح: تأكد أنه نسخة مصدّرة من هذه اللوحة.')}
 }
 return <div className="admin-backup">
  <section className="admin-card"><span className="admin-eyebrow">تصدير</span><h2>احفظ نسخة من كل المحتوى</h2><p className="admin-muted">ملف JSON يضم النبذة والكتابات والأفكار والوسائط واللقاءات والكتب وإعدادات الموقع. حجم المسودة الحالية {(size/1024).toLocaleString('ar-SA',{maximumFractionDigits:0})} كيلوبايت.</p><button className="admin-btn is-primary" onClick={exportCopy}>تصدير النسخة الحالية ↓</button></section>
  <section className="admin-card"><span className="admin-eyebrow">استيراد</span><h2>استعد نسخة سابقة</h2><p className="admin-muted">يُفحص الملف قبل تحميله، ويُحفظ مسودةً محلية لا تُنشر حتى تؤكد النشر.</p><label className="admin-file"><span>اختر ملف النسخة</span><input type="file" accept=".json,application/json" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void importCopy(file)}}/></label>{previous&&<div className="admin-inline-notice" role="status"><span>استُوردت النسخة.</span><button className="admin-btn" onClick={()=>{if(save(previous))setPrevious(null)}}>تراجع عن الاستيراد</button></div>}</section>
 </div>
}
