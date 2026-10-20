import {L} from '../lib/locale-ui'
import {useEffect,useState} from 'react'
import type {Content} from '../content'
import {defaultSite} from '../site'
export function ReaderQuestion({content}:{content:Content}){
 const site=content.site??defaultSite
 const [question,setQuestion]=useState('')
 const [message,setMessage]=useState('')
 useEffect(()=>{try{const saved=localStorage.getItem('kumeel-reader-question');if(saved&&saved.length<=1000)setQuestion(saved)}catch{/* Draft is optional. */}},[])
 const enabled=site.showWhatsapp&&Boolean(site.whatsapp)
 return <L.section className="reader-question wrap"><L.div><L.span className="section-label">من سؤالك تبدأ فكرة</L.span><L.h2>سؤال يؤرقك؟<L.br/>قناعة تود اختبارها؟</L.h2><L.p>شارك سؤالًا ليكون بداية محتملة لمقال أو لقاء. لا يُنشر سؤالك تلقائيًا.</L.p></L.div><L.form onSubmit={e=>{e.preventDefault();if(!enabled||!question.trim())return;const text=`سؤال لمنصة كميل:\n${question.trim()}\n\nأرجو عدم نشر اسمي أو بياناتي دون موافقتي.`;const url=`https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;window.open(url,'_blank','noopener,noreferrer');setMessage('فُتح واتساب برسالة جاهزة. راجعها واضغط إرسال هناك؛ لم تُرسل المنصة السؤال تلقائيًا.')}}><L.label>سؤالك أو القناعة<L.textarea required maxLength={1000} value={question} onChange={e=>{setQuestion(e.target.value);try{localStorage.setItem('kumeel-reader-question',e.target.value)}catch{setMessage('تعذّر حفظ مسودة سؤالك على المتصفح.')}}}/></L.label><L.small>{question.length} / 1000 · تجنّب البيانات الشخصية الحساسة.</L.small><L.button className="primary" disabled={!enabled}>راجع السؤال في واتساب ↗</L.button>{!enabled&&<L.p>استقبال الأسئلة غير مفعّل حاليًا.</L.p>}<L.p className="sample-note">يُحفظ نصك محليًا على هذا المتصفح أثناء الكتابة. الإرسال يتم في واتساب باختيارك.</L.p><L.button type="button" onClick={()=>{setQuestion('');setMessage('');try{localStorage.removeItem('kumeel-reader-question')}catch{/* Optional draft removal. */}}}>مسح مسودة السؤال</L.button><L.p role="status">{message}</L.p></L.form></L.section>
}
