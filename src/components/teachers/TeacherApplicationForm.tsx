import {useEffect,useId,useState} from 'react'
import {supabase} from '../../lib/cloud'
import {communityError} from '../../lib/community'
import {applicationReady,applicationState,blankApplication,fieldErrors,teacherFields,type TeacherApplication} from '../../lib/teachers'
import {TeacherCard} from './TeacherCard'

export function TeacherApplicationForm({userId}:{userId:string}){
 const id=useId()
 const [item,setItem]=useState<TeacherApplication>(blankApplication())
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [touched,setTouched]=useState(false)
 const [message,setMessage]=useState('')
 useEffect(()=>{let active=true;supabase.from('kumeel_teacher_applications').select('*').eq('user_id',userId).maybeSingle().then(({data,error})=>{if(!active)return;if(error)setMessage(communityError(error));else if(data)setItem({...blankApplication(),...data} as TeacherApplication);setLoading(false)});return()=>{active=false}},[userId])

 const state=applicationState(item)
 const errors=fieldErrors(item)
 const editable=!loading&&state.canEdit&&!busy
 async function submit(){
  setTouched(true)
  if(!applicationReady(item)){setMessage('أكمل الحقول المطلوبة قبل الإرسال.');return}
  setBusy(true);setMessage('')
  try{
   const {error}=await supabase.rpc('kumeel_apply_teacher',{p_revision:item.revision??null,p_name:item.name,p_specialty:item.specialty,p_bio:item.bio,p_approach:item.approach,p_audience:item.audience,p_languages:item.languages,p_qualifications:item.qualifications??''})
   if(error)throw error
   const {data,error:readError}=await supabase.from('kumeel_teacher_applications').select('*').eq('user_id',userId).single()
   if(readError)throw readError
   setItem({...blankApplication(),...data} as TeacherApplication);setTouched(false)
   setMessage('أُرسل الطلب للمراجعة. لن تتغيّر صفحتك العامة حتى تعتمدها الإدارة.')
  }catch(error){setMessage(communityError(error))}
  finally{setBusy(false)}
 }

 return <section id="teacher-application" className="teacher-apply" aria-labelledby={`${id}-title`}>
  <header><span className="section-label">مجلس التعلّم</span><h2 id={`${id}-title`}>صفحتك كمعلم</h2><p>صفحة تعريفية يراجعها فريق الإدارة قبل نشرها في <a href="/teachers">مجلس التعلّم</a>. لا تضع أرقام تواصل أو بيانات طلاب أو وثائق حساسة في النصوص العامة.</p></header>
  <div className={`teacher-status is-${state.tone}`} role="status"><strong>{loading?'جارٍ تحميل طلبك…':state.label}</strong>{!loading&&<p>{state.text}</p>}{item.review_note&&<blockquote><b>ملاحظة الإدارة:</b> {item.review_note}</blockquote>}</div>
  <div className="teacher-apply-grid">
   <form className="teacher-apply-form" noValidate onSubmit={e=>{e.preventDefault();if(editable)void submit()}}>
    <fieldset disabled={!editable}>
     {teacherFields.map(f=>{const error=touched?errors[f.key]:undefined;const value=item[f.key]??'';const fieldId=`${id}-${f.key}`;return <label key={f.key} className={`teacher-field${f.private?' is-private':''}`} htmlFor={fieldId}>
      <span className="teacher-field-label">{f.label}{f.min>0?<i aria-hidden="true"> *</i>:<small> (اختياري)</small>}{f.private&&<em>خاص بالإدارة</em>}</span>
      {f.multiline?<textarea id={fieldId} rows={f.key==='bio'?6:4} maxLength={f.max} value={value} aria-invalid={Boolean(error)} aria-describedby={`${fieldId}-hint`} onChange={e=>setItem({...item,[f.key]:e.target.value})}/>
      :<input id={fieldId} maxLength={f.max} value={value} aria-invalid={Boolean(error)} aria-describedby={`${fieldId}-hint`} onChange={e=>setItem({...item,[f.key]:e.target.value})}/>}
      <span id={`${fieldId}-hint`} className="teacher-field-hint"><span className={error?'is-error':''}>{error??f.hint}</span><span className="teacher-count">{value.trim().length.toLocaleString('ar-SA')}{f.min>0&&value.trim().length<f.min?` / ${f.min.toLocaleString('ar-SA')}`:''}</span></span>
     </label>})}
     <div className="teacher-apply-actions"><button className="primary" disabled={busy}>{busy?'جارٍ الإرسال…':item.status?'أرسل التعديل للمراجعة':'أرسل الطلب للمراجعة'}</button><span role="status">{message}</span></div>
    </fieldset>
   </form>
   <aside className="teacher-apply-preview" aria-label="معاينة الصفحة العامة"><span className="teacher-preview-label">هكذا تظهر بطاقتك</span><TeacherCard teacher={item} preview/></aside>
  </div>
 </section>
}
