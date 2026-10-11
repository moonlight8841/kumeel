import {supabase} from '../lib/cloud'
import {useEffect,useState} from 'react'
import type {Content,Idea} from '../content'
const methods=[['inversion','قلب البديهيات','متى لا تصح هذه القناعة؟ ومن يستفيد من عكسها؟'],['experiment','تجربة معاصرة','لو تغيّر هذا العنصر وحده، هل يبقى حكمك كما هو؟'],['concept','تفكيك مفهوم','ما الفرق بين هذه الكلمة وأقرب كلمة إليها؟ قدّم مثالًا وحدًّا مضادًا.'],['reading','اعتراض من قراءة','ما أقوى حجة ضد رأي أعجبك؟ ما الدليل المستقل عنه؟'],['audience','سؤال من الجمهور','ما الافتراض الخفي وراء هذا السؤال؟ وما الذي يحتاج إلى توضيح؟']]
const key='kumeel-idea-engine-v1'
type Draft={method:string;seed:string;title:string;text:string;question:string;counterpoint:string;source:string;sourceUrl:string}
const blank:Draft={method:'inversion',seed:'',title:'',text:'',question:'',counterpoint:'',source:'',sourceUrl:''}
export function IdeaEngine({content,save}:{content:Content;save:(c:Content)=>boolean}){
 const [draft,setDraft]=useState<Draft>(blank)
 const [notes,setNotes]=useState<string[]>([])
 const [quick,setQuick]=useState('')
 const [ready,setReady]=useState(false)
 const [generating,setGenerating]=useState(false)
 const [message,setMessage]=useState('')
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&saved.draft&&Object.keys(blank).every(k=>typeof saved.draft[k]==='string'&&saved.draft[k].length<=10000)&&methods.some(m=>m[0]===saved.draft.method))setDraft(saved.draft);if(Array.isArray(saved?.notes))setNotes(saved.notes.filter((v:unknown)=>typeof v==='string'&&v.length<=1000).slice(0,100))}catch{setMessage('تعذّر استعادة دفتر المصنع.')}setReady(true)},[])
 useEffect(()=>{if(!ready)return;try{localStorage.setItem(key,JSON.stringify({draft,notes}))}catch{setMessage('تعذّر حفظ دفتر المصنع محليًا. انسخ النص للاحتفاظ به.')}},[draft,notes,ready])
 async function generateIdea(){
  if(generating)return
  if(!draft.seed.trim()){setMessage('اكتب الموضوع أو السؤال أولًا.');return}
  if((draft.title||draft.text||draft.question||draft.counterpoint)&&!window.confirm('استبدال حقول الصياغة الحالية باقتراح Gemini؟'))return
  setGenerating(true);setMessage('')
  try{
   const {data:{session}}=await supabase.auth.getSession()
   if(!session)throw new Error('سجّل الدخول بحساب الإدارة؛ التجربة المحلية لا تستدعي Gemini.')
   const response=await fetch('/api/generate-idea',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({topic:draft.seed,method:draft.method}),signal:AbortSignal.timeout(45000)})
   const result=await response.json()
   if(!response.ok||!result.success)throw new Error(result.error||'تعذّر توليد الاقتراح.')
   if(!result.data||['title','text','question','counterpoint'].some(k=>typeof result.data[k]!=='string'))throw new Error('اقتراح غير صالح.')
   setDraft(current=>({...current,title:result.data.title,text:result.data.text,question:result.data.question,counterpoint:result.data.counterpoint,source:'',sourceUrl:''}))
   setMessage('اقتراح آلي يحتاج مراجعتك. عدّل الصياغة وتحقّق من أي ادعاء، ثم أضفه إلى المسودة.')
  }catch(error){setMessage(error instanceof Error?error.message:'تعذّر التوليد.')}finally{setGenerating(false)}
 }
 const method=methods.find(m=>m[0]===draft.method)??methods[0]
 return <section className="idea-engine"><span className="section-label">مصنع الأفكار / من ملاحظة إلى سؤال</span><h2>لا تنتظر الإلهام. أعطِ السؤال مسارًا.</h2><p>قوالب تحريرية تساعدك على التفكير. لا تولّد حقائق أو اقتباسات أو مصادر؛ أنت تراجع النص قبل نشره.</p><form onSubmit={e=>{e.preventDefault();if(quick.trim()&&notes.length<100){setNotes([quick.trim(),...notes]);setQuick('')}}}><label>ملاحظة سريعة<input maxLength={1000} required value={quick} onChange={e=>setQuick(e.target.value)}/></label><button disabled={notes.length>=100}>احتفظ بالسؤال</button></form><div className="engine-notes">{notes.map((note,i)=><div key={i}><button onClick={()=>setDraft({...draft,seed:note})}>{note}</button><button aria-label={`إزالة الملاحظة ${i+1}`} onClick={()=>setNotes(notes.filter((_,n)=>n!==i))}>×</button></div>)}</div><form onSubmit={e=>{e.preventDefault();if(!draft.counterpoint.trim()){setMessage('أنصف اعتراضًا واحدًا قبل إضافة الفكرة.');return}const idea:Idea={id:crypto.randomUUID(),title:draft.title.trim(),kind:draft.method==='experiment'?'تجربة فكرية':draft.method==='reading'?'درس':'حكمة',text:draft.text.trim(),question:draft.question.trim(),counterpoint:draft.counterpoint.trim(),sample:true,...(draft.source.trim()?{source:draft.source.trim()}:{}),...(draft.sourceUrl.trim()?{sourceUrl:draft.sourceUrl.trim()}:{})};if(save({...content,ideas:[...(content.ideas??[]),idea]})){setMessage('أُضيفت الفكرة إلى مسودة المرصد كنموذج غير منسوب إليك. راجعها من الأفكار والوسائط واللقاءات، وأزل علامة النموذج بعد اعتمادها، ثم انشر.');setDraft(blank)}}}><fieldset disabled={generating}><label>مسار توليد الفكرة<select value={draft.method} onChange={e=>setDraft({...draft,method:e.target.value})}>{methods.map(m=><option key={m[0]} value={m[0]}>{m[1]}</option>)}</select></label><label>القناعة أو الكلمة أو السؤال<textarea maxLength={1000} value={draft.seed} onChange={e=>setDraft({...draft,seed:e.target.value})}/></label><button type="button" className="primary" disabled={generating||!draft.seed.trim()} onClick={()=>void generateIdea()}>{generating?'جارٍ إعداد الاقتراح…':'اقترح فكرة بمساعدة Gemini'}</button><p className="sample-note">يُرسل الموضوع إلى Google عند الضغط. الاقتراح لا يُنشر تلقائيًا.</p><aside className="mind-feedback"><b>{method[1]}</b><p>{method[2]}</p>{draft.seed&&<p>طبّق هذا المسار على: «{draft.seed}»</p>}</aside>{([['title','عنوان الفكرة',150],['text','صياغتك للفكرة',10000],['question','السؤال الذي تتركه للقارئ',1000],['counterpoint','أقوى اعتراض منصف',10000],['source','المصدر / المؤلف والصفحة (عند الاستناد إلى قراءة)',1000],['sourceUrl','رابط المصدر (اختياري)',2000]] as const).map(([field,label,max])=><label key={field}>{label}{field==='sourceUrl'?<input type="url" maxLength={max} value={draft[field]} onChange={e=>setDraft({...draft,[field]:e.target.value})}/>:<textarea required={field!=='source'} maxLength={max} value={draft[field]} onChange={e=>setDraft({...draft,[field]:e.target.value})}/>}</label>)}<button className="primary">أضف إلى مسودة المرصد</button></fieldset></form><p className="sample-note">دفتر المصنع محفوظ على هذا المتصفح. إضافته إلى المرصد لا تنشره؛ استخدم حفظ المسودة السحابية للاحتفاظ به في حسابك.</p><p role="status">{message}</p></section>
}
