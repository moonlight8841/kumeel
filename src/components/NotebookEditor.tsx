import {useEffect,useRef,useState} from 'react'
import type {Content,Writing} from '../content'
import {TextDocument} from './TextDocument'
type Props={content:Content;save:(next:Content)=>boolean;onDirtyChange:(dirty:boolean)=>void}
const bufferKey='kumeel-notebook-buffer-v1'
const empty:Writing={id:'',title:'',category:'فلسفة',text:'',format:'markdown'}
function validBuffer(value:unknown):value is Writing{
 if(!value||typeof value!=='object')return false
 const w=value as Writing
 return typeof w.id==='string'&&w.id.length<=150&&typeof w.title==='string'&&w.title.length<=150&&typeof w.text==='string'&&w.text.length<=50000&&['فلسفة','علوم','ثقافة','تأملات','شعر'].includes(w.category)&&(w.format===undefined||['plain','markdown'].includes(w.format))
}
export function NotebookEditor({content,save,onDirtyChange}:Props){
 const [value,setValue]=useState<Writing>(empty)
 const [baseline,setBaseline]=useState(JSON.stringify(empty))
 const [recover,setRecover]=useState<Writing|null>(null)
 const [preview,setPreview]=useState(true)
 const [query,setQuery]=useState('')
 const [message,setMessage]=useState('')
 const input=useRef<HTMLTextAreaElement>(null)
 const dirty=JSON.stringify(value)!==baseline
 const existing=content.writings.some(w=>w.id===value.id)
 useEffect(()=>{try{const saved:unknown=JSON.parse(localStorage.getItem(bufferKey)||'null');if(validBuffer(saved))setRecover(saved)}catch{setMessage('تعذّر استعادة نسخة التحرير المؤقتة.')}},[])
 useEffect(()=>{onDirtyChange(dirty||Boolean(recover));if(!dirty)return;const timer=setTimeout(()=>{try{localStorage.setItem(bufferKey,JSON.stringify(value))}catch{setMessage('تعذّر حفظ نسخة التحرير المؤقتة. احفظ المسودة أو صدّر نصك.')}},500);return()=>clearTimeout(timer)},[value,dirty,recover,onDirtyChange])
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue=''};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[dirty])
 function saveText(){
  const next={...value,id:value.id||crypto.randomUUID(),title:value.title.trim(),text:value.text.trim()}
  if(!next.title||!next.text){setMessage('أضف عنوانًا ونصًا قبل الحفظ.');return}
  if(save({...content,writings:existing?content.writings.map(w=>w.id===next.id?next:w):[...content.writings,next]})){
   setValue(next);setBaseline(JSON.stringify(next));onDirtyChange(false);setRecover(null)
   try{localStorage.removeItem(bufferKey)}catch{/* The saved content is authoritative. */}
   setMessage('حُفظ النص في مسودة الدفتر. راجع المعاينة ثم استخدم «نشر النسخة الحالية» أعلى الصفحة لإتاحته للزوار.')
  }else setMessage('لم يُحفظ النص. راجع صلاحيات الحساب والحقول، واحتفظ بنسخة منه.')
 }
 function open(next:Writing){if(dirty){setMessage('احفظ النص الحالي أو اختر «تجاهل تعديلاتي» قبل فتح نص آخر.');return}setValue({...next});setBaseline(JSON.stringify(next));setMessage('')}
 function format(kind:'bold'|'heading'|'quote'|'list'){
  const element=input.current;if(!element)return
  const start=element.selectionStart,end=element.selectionEnd
  const selected=value.text.slice(start,end)||'اكتب هنا'
  const inserted=kind==='bold'?`**${selected}**`:kind==='heading'?`\n\n## ${selected}\n\n`:kind==='quote'?`\n\n${selected.split('\n').map(line=>`> ${line}`).join('\n')}\n\n`:`\n\n${selected.split('\n').map(line=>`- ${line}`).join('\n')}\n\n`
  const next=value.text.slice(0,start)+inserted+value.text.slice(end)
  if(next.length>50000){setMessage('الحد الأقصى للنص ٥٠ ألف حرف.');return}
  setValue({...value,text:next,format:'markdown'})
  requestAnimationFrame(()=>{element.focus();element.setSelectionRange(start,start+inserted.length)})
 }
 function discard(){const previous=content.writings.find(w=>w.id===value.id)??empty;setValue(previous);setBaseline(JSON.stringify(previous));onDirtyChange(false);setRecover(null);try{localStorage.removeItem(bufferKey)}catch{/* Optional cleanup. */}setMessage('أُلغيت التعديلات غير المحفوظة.')}
 const words=value.text.trim()?value.text.trim().split(/\s+/).length:0
 return <section className="notebook-editor"><div className="notebook-heading"><div><span className="section-label">محرر الدفتر</span><h2>اكتب الفكرة. راجعها. ثم انشرها.</h2><p>١. حرّر النص · ٢. احفظ مسودة الدفتر · ٣. انشر النسخة الحالية من أدوات النشر السحابي.</p></div><button onClick={()=>open(empty)}>نص جديد +</button></div>{recover&&<div className="notebook-recovery"><p>توجد نسخة تحرير مؤقتة: {recover.title||'نص دون عنوان'}</p><button disabled={dirty} onClick={()=>{setValue(recover);setBaseline(JSON.stringify(content.writings.find(w=>w.id===recover.id)??empty));setRecover(null);setMessage('استُعيدت نسخة التحرير. راجعها واحفظها في الدفتر.')}}>استعادة التحرير السابق</button><button onClick={()=>{setRecover(null);try{localStorage.removeItem(bufferKey)}catch{/* Optional cleanup. */}}}>إزالة النسخة المؤقتة</button></div>}<div className="notebook-layout"><aside className="notebook-index"><label>ابحث في نصوصك<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="العنوان أو النص…"/></label><div>{content.writings.filter(w=>`${w.title} ${w.text}`.includes(query.trim())).map(w=><button key={w.id} aria-pressed={value.id===w.id} onClick={()=>open(w)}><span>{w.category}</span><strong>{w.title}</strong></button>)}</div></aside><div><form onSubmit={e=>{e.preventDefault();saveText()}} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveText()}}}><div className="notebook-status" role="status"><span className={dirty?'dirty-badge':'saved-badge'}>{dirty?'تعديلات لم تُحفظ في الدفتر':existing?'محفوظ في المسودة':'نص جديد'}</span><span>{words.toLocaleString('ar-SA')} كلمة · نحو {Math.max(1,Math.ceil(words/180)).toLocaleString('ar-SA')} دقائق قراءة</span></div><label>عنوان النص<input name="title" value={value.title} onChange={e=>setValue({...value,title:e.target.value})} required maxLength={150}/></label><div className="notebook-fields"><label>التصنيف<select value={value.category} onChange={e=>setValue({...value,category:e.target.value as Writing['category']})}>{['فلسفة','علوم','ثقافة','تأملات','شعر'].map(c=><option key={c}>{c}</option>)}</select></label><label>تنسيق النص<select value={value.format??'plain'} onChange={e=>setValue({...value,format:e.target.value as Writing['format']})}><option value="plain">نص عادي</option><option value="markdown">عناوين وقوائم واقتباسات</option></select></label></div><div className="notebook-toolbar" role="group" aria-label="تنسيق النص"><button type="button" onClick={()=>format('heading')}>عنوان فرعي</button><button type="button" onClick={()=>format('bold')}>تأكيد</button><button type="button" onClick={()=>format('quote')}>اقتباس</button><button type="button" onClick={()=>format('list')}>قائمة</button><button type="button" aria-pressed={preview} onClick={()=>setPreview(!preview)}>المعاينة</button></div><label>نص الدفتر<textarea className="notebook-textarea" name="text" ref={input} required maxLength={50000} value={value.text} onChange={e=>setValue({...value,text:e.target.value})}/></label><div className="notebook-save-actions"><button className="primary">حفظ مسودة النص</button><button type="button" disabled={!dirty} onClick={discard}>تجاهل تعديلاتي</button><button type="button" onClick={()=>{const url=URL.createObjectURL(new Blob([`${value.title}\n\n${value.text}`],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='kumeel-writing.txt';a.click();URL.revokeObjectURL(url)}}>تصدير النص ↓</button>{existing&&!dirty&&<a className="text-link" href={`/writings/${value.id}`} target="_blank" rel="noopener noreferrer">معاينة صفحة النص ↗</a>}</div></form>{preview&&<article className="notebook-preview"><span className="section-label">معاينة قبل النشر</span><h2>{value.title||'عنوانك هنا'}</h2><div className="publication-text"><TextDocument text={value.text||'ابدأ الكتابة لترى النص هنا.'} format={value.format}/></div></article>}<p role="status">{message}</p><p className="sample-note">تُحفظ نسخة التحرير مؤقتًا في هذا المتصفح. الحفظ لا ينشر النص؛ النشر السحابي يتطلب صلاحية الإدارة والتحقق الثنائي.</p></div></div></section>
}
