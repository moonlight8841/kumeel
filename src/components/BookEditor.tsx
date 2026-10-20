import {useRef,useState,type FormEvent,type ChangeEvent} from 'react'
import {booksFor,bookCategories,bookFocus,validBooks,type Book} from '../books'
import {uploadBook} from '../lib/cloud'
import type {Content} from '../content'

export function BookEditor({content,save}:{content:Content;save:(next:Content)=>boolean}){
 const [selected,setSelected]=useState<Book|null>(null)
 const [fileUrl,setFileUrl]=useState(''),[size,setSize]=useState('0')
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const lock=useRef(false)
 const books=booksFor(content)
 function open(book:Book|null){if(lock.current)return;setSelected(book);setFileUrl(book?.fileUrl??'');setSize(String((book?.bytes??0)/1024/1024));setMessage('')}
 async function upload(event:ChangeEvent<HTMLInputElement>){
  const file=event.currentTarget.files?.[0];event.currentTarget.value=''
  if(!file||lock.current)return
  lock.current=true;setBusy(true);setMessage('جارٍ رفع ملف PDF…')
  try{const result=await uploadBook(file);setFileUrl(result.url);setSize(String(result.bytes/1024/1024));setMessage('رُفع الملف. أكمل البيانات واحفظ الكتاب، ثم انشر المسودة لإظهاره في الفهرس.')}
  catch(error){setMessage(error instanceof Error?error.message:'تعذّر رفع الكتاب.')}
  finally{lock.current=false;setBusy(false)}
 }
 function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(lock.current)return
  const form=event.currentTarget,f=new FormData(form),url=fileUrl.trim()
  const item:Book={id:selected?.id??crypto.randomUUID(),title:String(f.get('title')).trim(),subtitle:String(f.get('subtitle')).trim(),author:String(f.get('author')).trim(),description:String(f.get('description')).trim(),category:String(f.get('category')) as Book['category'],focus:String(f.get('focus')),pages:Number(f.get('pages')),bytes:Math.round(Number(size)*1024*1024),language:String(f.get('language')),review:String(f.get('review')||'').trim(),quote:String(f.get('quote')||'').trim(),quoteSource:String(f.get('quoteSource')||'').trim(),featured:f.get('featured')==='on',order:selected?.order??books.length,...(url?{fileUrl:url}:{})}
  if(!validBooks([item])){setMessage('راجع بيانات الكتاب ورابط PDF وحجم الملف قبل الحفظ.');return}
  if(save({...content,books:selected?books.map(b=>b.id===item.id?item:b):[...books,item]})){open(null);form.reset();setMessage('حُفظ الكتاب في المسودة. انشرها ليظهر في المكتبة العامة.')}
 }
 return <section>
  <h2>مكتبة الكتب</h2><p>ارفع ملف PDF أو أضف رابطه، ثم احفظ بيانات الكتاب. النشر العام يتم من أدوات النشر السحابي.</p>
  <div className="admin-list">{books.map(b=><button key={b.id} disabled={busy} onClick={()=>open(b)}>{b.title} · تحرير</button>)}</div>
  <form key={selected?.id??'new-book'} onSubmit={submit} aria-busy={busy}>
   <h3>{selected?'تحرير الكتاب':'إضافة كتاب'}</h3><fieldset disabled={busy}>
    <label>العنوان الأصلي<input name="title" defaultValue={selected?.title} required maxLength={200}/></label>
    <label>العنوان العربي / الوصف المختصر<input name="subtitle" defaultValue={selected?.subtitle} required maxLength={200}/></label>
    <label>المؤلف أو الجهة<input name="author" defaultValue={selected?.author} required maxLength={200}/></label>
    <label>الرفّ<select name="category" defaultValue={selected?.category??'english'}>{Object.entries(bookCategories).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
    <label>المجال<select name="focus" defaultValue={selected?.focus??'general'}>{Object.entries(bookFocus).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
    <label>دعوة القراءة<textarea name="description" defaultValue={selected?.description} required maxLength={2000}/></label>
    <label>عدد الصفحات<input name="pages" type="number" min="1" max="10000" defaultValue={selected?.pages??1} required/></label>
    <label>رفع ملف PDF<input type="file" accept="application/pdf,.pdf" onChange={upload}/></label>
    <p className="sample-note">حتى ٥٠ ميغابايت. ارفع نسخة تملك حق مشاركتها وبعد فحص محتواها. الملف المرفوع عام لمن يملك رابطه، حتى قبل نشر الفهرس.</p>
    <label>حجم الملف بالميغابايت<input name="size" type="number" min="0" max="50" step="any" value={size} onChange={e=>setSize(e.target.value)} required/></label>
    <label>رمز اللغة<input name="language" defaultValue={selected?.language??'en'} required maxLength={20}/></label>
    <label>رابط PDF العام<input name="fileUrl" type="url" placeholder="https://…/book.pdf" value={fileUrl} onChange={e=>setFileUrl(e.target.value)}/></label>
    <p className="sample-note">يمكن إضافة رابط PDF موجود بدل الرفع. تركه فارغًا يعرض بيانات الكتاب فقط.</p>
    <label>قراءتي للكتاب<textarea name="review" defaultValue={selected?.review} maxLength={2000}/></label>
    <label>اقتباس مختار<textarea name="quote" defaultValue={selected?.quote} maxLength={1000}/></label>
    <label>مصدر الاقتباس<input name="quoteSource" defaultValue={selected?.quoteSource} maxLength={300}/></label>
    <label className="admin-check"><input name="featured" type="checkbox" defaultChecked={selected?.featured}/>بداية قراءة مقترحة</label>
    <button className="primary">حفظ الكتاب</button><button type="button" onClick={()=>open(null)}>إضافة كتاب آخر</button>
   </fieldset>
  </form><p role="status">{message}</p>
  <h3>الترتيب والإزالة</h3>{books.map((b,index)=><div className="admin-row" key={b.id}><span>{b.title}</span><button disabled={busy||index===0} onClick={()=>{const next=[...books];[next[index-1],next[index]]=[next[index],next[index-1]];save({...content,books:next.map((item,order)=>({...item,order}))})}}>↑</button><button disabled={busy||index===books.length-1} onClick={()=>{const next=[...books];[next[index+1],next[index]]=[next[index],next[index+1]];save({...content,books:next.map((item,order)=>({...item,order}))})}}>↓</button><button disabled={busy} onClick={()=>save({...content,books:books.filter(item=>item.id!==b.id)})}>إزالة من الفهرس</button></div>)}
 </section>
}
