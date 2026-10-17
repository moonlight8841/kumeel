import {PRIVATE_DATA_CLEARED} from '../lib/privacy'
import {useEffect,useState} from 'react'
import type {Content} from '../content'
import {defaultSite} from '../site'
export function ReaderQuestion({content}:{content:Content}){
 const site=content.site??defaultSite
 const [question,setQuestion]=useState('')
 const [message,setMessage]=useState('')
 useEffect(()=>{try{const saved=sessionStorage.getItem('kumeel-reader-question');if(saved&&saved.length<=1000)setQuestion(saved)}catch{/* Draft is optional. */}},[])
 useEffect(()=>{const clear=()=>{setQuestion('');setMessage('')};window.addEventListener(PRIVATE_DATA_CLEARED,clear);return()=>window.removeEventListener(PRIVATE_DATA_CLEARED,clear)},[])
 const enabled=site.showWhatsapp&&Boolean(site.whatsapp)
 return <section className="reader-question wrap"><div><span className="section-label">من سؤالك تبدأ فكرة</span><h2>سؤال يؤرقك؟<br/>قناعة تود اختبارها؟</h2><p>شارك سؤالًا ليكون بداية محتملة لمقال أو لقاء. لا يُنشر سؤالك تلقائيًا.</p></div><form onSubmit={e=>{e.preventDefault();if(!enabled||!question.trim())return;const text=`سؤال لمنصة كميل:\n${question.trim()}\n\nأرجو عدم نشر اسمي أو بياناتي دون موافقتي.`;const url=`https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;window.open(url,'_blank','noopener,noreferrer');setMessage('فُتح واتساب برسالة جاهزة. راجعها واضغط إرسال هناك؛ لم تُرسل المنصة السؤال تلقائيًا.')}}><label>سؤالك أو القناعة<textarea required maxLength={1000} value={question} onChange={e=>{setQuestion(e.target.value);try{sessionStorage.setItem('kumeel-reader-question',e.target.value)}catch{setMessage('تعذّر حفظ مسودة سؤالك على المتصفح.')}}}/></label><small>{question.length} / 1000 · تجنّب البيانات الشخصية الحساسة.</small><button className="primary" disabled={!enabled}>راجع السؤال في واتساب ↗</button>{!enabled&&<p>استقبال الأسئلة غير مفعّل حاليًا.</p>}<p className="sample-note">يُحفظ نصك في هذا التبويب أثناء الكتابة، ويزول بإغلاقه. الإرسال يتم في واتساب باختيارك.</p><button type="button" onClick={()=>{setQuestion('');setMessage('');try{sessionStorage.removeItem('kumeel-reader-question');localStorage.removeItem('kumeel-reader-question')}catch{/* Optional draft removal. */}}}>مسح مسودة السؤال</button><p role="status">{message}</p></form></section>
}
