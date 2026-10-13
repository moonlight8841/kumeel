import {useEffect,useState} from 'react'
import {supabase} from '../../lib/cloud'
import {communityError} from '../../lib/community'
import {statusInfo,teacherFields,type TeacherApplication,type TeacherStatus} from '../../lib/teachers'
import {TeacherCard} from './TeacherCard'

type Decision='published'|'changes_requested'|'rejected'
const decisions:{value:Decision;label:string;needsNote:boolean;danger?:boolean}[]=[{value:'published',label:'اعتماد الصفحة',needsNote:false},{value:'changes_requested',label:'إعادة للتعديل',needsNote:true},{value:'rejected',label:'رفض أو حجب',needsNote:true,danger:true}]

export function TeacherReview(){
 const [filter,setFilter]=useState<TeacherStatus>('pending')
 const [items,setItems]=useState<TeacherApplication[]>([])
 const [notes,setNotes]=useState<Record<string,string>>({})
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [version,setVersion]=useState(0)
 useEffect(()=>{let active=true;setBusy(true);supabase.from('kumeel_teacher_applications').select('*').eq('status',filter).order('updated_at').limit(50).then(({data,error})=>{if(!active)return;if(error)setMessage(communityError(error));else{setItems((data??[]) as TeacherApplication[]);setMessage('')}setBusy(false)});return()=>{active=false}},[version,filter])

 async function decide(item:TeacherApplication,decision:Decision){
  const note=(notes[item.user_id!]??'').trim()
  // The database requires a reason for anything but approval; say so before the round trip.
  if(decision!=='published'&&note.length<3){setMessage('اكتب سبب الإعادة أو الحجب (ثلاثة أحرف على الأقل).');return}
  if(!window.confirm(`${decisions.find(d=>d.value===decision)!.label}: ${item.name}؟`))return
  setBusy(true)
  try{
   const {error}=await supabase.rpc('kumeel_review_teacher',{p_user:item.user_id,p_revision:item.revision,p_decision:decision,p_note:note})
   if(error)throw error
   setItems(v=>v.filter(t=>t.user_id!==item.user_id))
   setMessage('حُفظ القرار وسُجّل في سجل المراجعة.')
  }catch(error){setMessage(communityError(error))}
  finally{setBusy(false)}
 }

 return <div className="teacher-review">
  <p className="admin-muted">تحقق من ملاءمة التخصص ووضوح أسلوب التعليم. الاعتماد ينشر الصفحة دون إعلان توثيق المؤهلات.</p>
  <div className="teacher-review-bar"><div className="tabs" role="tablist" aria-label="حالة الطلبات">{(['pending','published','changes_requested','rejected'] as TeacherStatus[]).map(s=><button key={s} role="tab" aria-selected={filter===s} aria-pressed={filter===s} disabled={busy} onClick={()=>setFilter(s)}>{statusInfo[s].label}</button>)}</div><button className="admin-btn" disabled={busy} onClick={()=>setVersion(v=>v+1)}>تحديث</button></div>
  <p role="status" className="admin-muted">{busy?'جارٍ التحميل…':message||`${items.length.toLocaleString('ar-SA')} طلب`}</p>
  {!busy&&!items.length&&<p className="admin-empty">لا توجد طلبات في هذه الحالة.</p>}
  {items.map(item=><article key={item.user_id} className="admin-card teacher-review-item">
   <div className="teacher-review-grid">
    <TeacherCard teacher={item} preview/>
    <dl className="teacher-review-fields">{teacherFields.filter(f=>f.multiline).map(f=><div key={f.key}><dt>{f.label}{f.private&&<small> · خاص</small>}</dt><dd className="preserve-lines">{item[f.key]||'—'}</dd></div>)}</dl>
   </div>
   {(filter==='pending'||filter==='published')&&<div className="teacher-review-decide">
    <label className="admin-field"><span className="admin-field-label">ملاحظة للمعلم (مطلوبة عند الإعادة أو الحجب)</span><textarea rows={2} maxLength={1000} value={notes[item.user_id!]??''} onChange={e=>setNotes({...notes,[item.user_id!]:e.target.value})}/></label>
    <div className="assist-actions">{decisions.filter(d=>!(filter==='published'&&d.value==='published')).map(d=><button key={d.value} className={`admin-btn${d.value==='published'?' is-primary':d.danger?' is-danger':''}`} disabled={busy} onClick={()=>void decide(item,d.value)}>{d.label}</button>)}</div>
   </div>}
  </article>)}
 </div>
}
