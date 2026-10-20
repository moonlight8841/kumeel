import {L} from '../../lib/locale-ui'
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

 return <L.section id="teacher-application" className="teacher-apply" aria-labelledby={`${id}-title`}>
  <L.header><L.span className="section-label">مجلس التعلّم</L.span><L.h2 id={`${id}-title`}>صفحتك كمعلم</L.h2><L.p>صفحة تعريفية يراجعها فريق الإدارة قبل نشرها في <L.a href="/teachers">مجلس التعلّم</L.a>. لا تضع أرقام تواصل أو بيانات طلاب أو وثائق حساسة في النصوص العامة.</L.p></L.header>
  <L.div className={`teacher-status is-${state.tone}`} role="status"><L.strong>{loading?'جارٍ تحميل طلبك…':state.label}</L.strong>{!loading&&<L.p>{state.text}</L.p>}{item.review_note&&<L.blockquote><L.b>ملاحظة الإدارة:</L.b> {item.review_note}</L.blockquote>}</L.div>
  <L.div className="teacher-apply-grid">
   <L.form className="teacher-apply-form" noValidate onSubmit={e=>{e.preventDefault();if(editable)void submit()}}>
    <L.fieldset disabled={!editable}>
     {teacherFields.map(f=>{const error=touched?errors[f.key]:undefined;const value=item[f.key]??'';const fieldId=`${id}-${f.key}`;return <L.label key={f.key} className={`teacher-field${f.private?' is-private':''}`} htmlFor={fieldId}>
      <L.span className="teacher-field-label">{f.label}{f.min>0?<L.i aria-hidden="true"> *</L.i>:<L.small> (اختياري)</L.small>}{f.private&&<L.em>خاص بالإدارة</L.em>}</L.span>
      {f.multiline?<L.textarea id={fieldId} rows={f.key==='bio'?6:4} maxLength={f.max} value={value} aria-invalid={Boolean(error)} aria-describedby={`${fieldId}-hint`} onChange={e=>setItem({...item,[f.key]:e.target.value})}/>
      :<L.input id={fieldId} maxLength={f.max} value={value} aria-invalid={Boolean(error)} aria-describedby={`${fieldId}-hint`} onChange={e=>setItem({...item,[f.key]:e.target.value})}/>}
      <L.span id={`${fieldId}-hint`} className="teacher-field-hint"><L.span className={error?'is-error':''}>{error??f.hint}</L.span><L.span className="teacher-count">{value.trim().length.toLocaleString('ar-SA')}{f.min>0&&value.trim().length<f.min?` / ${f.min.toLocaleString('ar-SA')}`:''}</L.span></L.span>
     </L.label>})}
     <L.div className="teacher-apply-actions"><L.button className="primary" disabled={busy}>{busy?'جارٍ الإرسال…':item.status?'أرسل التعديل للمراجعة':'أرسل الطلب للمراجعة'}</L.button><L.span role="status">{message}</L.span></L.div>
    </L.fieldset>
   </L.form>
   <L.aside className="teacher-apply-preview" aria-label="معاينة الصفحة العامة"><L.span className="teacher-preview-label">هكذا تظهر بطاقتك</L.span><TeacherCard teacher={item} preview/></L.aside>
  </L.div>
 </L.section>
}
