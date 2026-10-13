// Learning council (مجلس التعلّم): teacher profiles, applications and review.
// Field limits mirror supabase/teachers.sql; scripts/test-teachers.mjs fails if they drift.

export type TeacherStatus='pending'|'published'|'changes_requested'|'rejected'
export type TeacherProfile={id:string;name:string;specialty:string;bio:string;approach:string;audience:string;languages:string;published_at?:string}
export type TeacherApplication={user_id?:string;name:string;specialty:string;bio:string;approach:string;audience:string;languages:string;qualifications:string;status?:TeacherStatus;revision?:number;review_note?:string;updated_at?:string}
export type TeacherField=Exclude<keyof TeacherApplication,'user_id'|'status'|'revision'|'review_note'|'updated_at'>

export const PAGE_SIZE=20
export const PUBLIC_COLUMNS='id,name,specialty,bio,approach,audience,languages,published_at'

export const teacherFields:{key:TeacherField;label:string;min:number;max:number;multiline:boolean;hint:string;private?:boolean}[]=[
 {key:'name',label:'اسم العرض',min:2,max:60,multiline:false,hint:'الاسم الذي يراه المتعلّمون.'},
 {key:'specialty',label:'التخصص',min:3,max:120,multiline:false,hint:'مثال: الفلسفة الإسلامية، الفيزياء للمرحلة الثانوية، الكتابة الإبداعية.'},
 {key:'bio',label:'نبذة تعريفية',min:80,max:3000,multiline:true,hint:'من أنت في التعليم؟ ما الذي يشغلك في تخصصك؟'},
 {key:'approach',label:'كيف تدرّس؟',min:30,max:2000,multiline:true,hint:'طريقتك: حوار، تمارين، مشاريع، قراءة موجّهة…'},
 {key:'audience',label:'لمن يناسب تعليمك؟',min:3,max:200,multiline:false,hint:'المرحلة أو المستوى أو الاهتمام.'},
 {key:'languages',label:'لغات التدريس',min:2,max:120,multiline:false,hint:'افصل بينها بفاصلة: العربية، الإنجليزية'},
 {key:'qualifications',label:'الخبرة والمؤهلات',min:0,max:2000,multiline:true,hint:'للإدارة فقط، لا تظهر في صفحتك العامة. لا ترفق وثائق حساسة.',private:true},
]

export const blankApplication=():TeacherApplication=>({name:'',specialty:'',bio:'',approach:'',audience:'',languages:'العربية',qualifications:''})

// Same rule as the SQL checks: trimmed length within [min, max].
export function fieldErrors(item:TeacherApplication):Partial<Record<TeacherField,string>>{
 const errors:Partial<Record<TeacherField,string>>={}
 for(const f of teacherFields){
  const value=item[f.key]??''
  const length=value.trim().length
  if(f.key==='qualifications'?value.length>f.max:length>f.max)errors[f.key]=`الحد الأقصى ${f.max.toLocaleString('ar-SA')} حرف.`
  else if(length<f.min)errors[f.key]=f.min<=3?'هذا الحقل مطلوب.':`اكتب ${f.min.toLocaleString('ar-SA')} حرفًا على الأقل (الآن ${length.toLocaleString('ar-SA')}).`
 }
 return errors
}
export const applicationReady=(item:TeacherApplication)=>Object.keys(fieldErrors(item)).length===0

// What the applicant can do in each state (mirrors kumeel_apply_teacher).
export const statusInfo:Record<TeacherStatus|'new',{label:string;tone:'neutral'|'warning'|'success'|'danger';text:string;canEdit:boolean}>={
 new:{label:'لم يُرسل بعد',tone:'neutral',text:'املأ صفحتك وأرسلها. تراجعها الإدارة قبل أن تظهر للزوار.',canEdit:true},
 pending:{label:'بانتظار المراجعة',tone:'warning',text:'وصل طلبك. لا يمكن تعديله حتى تُراجَع النسخة الحالية.',canEdit:false},
 published:{label:'صفحتك منشورة',tone:'success',text:'صفحتك ظاهرة في مجلس التعلّم. أي تعديل يعود للمراجعة، وتبقى النسخة المنشورة ظاهرة حتى يُعتمد التعديل.',canEdit:true},
 changes_requested:{label:'يحتاج تعديلًا',tone:'warning',text:'راجع ملاحظة الإدارة، عدّل صفحتك، ثم أرسلها من جديد.',canEdit:true},
 rejected:{label:'لم يُعتمد',tone:'danger',text:'لم يُعتمد هذا الطلب. إن كان لديك استفسار فتواصل مع إدارة المنصة.',canEdit:false},
}
export const applicationState=(item:TeacherApplication)=>statusInfo[item.status??'new']

// ---------- Presentation helpers ----------
export function excerpt(text:string,max=180){const t=text.replace(/\s+/g,' ').trim();if(t.length<=max)return t;const cut=t.slice(0,max);const space=cut.lastIndexOf(' ');return `${(space>max*.6?cut.slice(0,space):cut).trim()}…`}
export function languageList(text:string){return [...new Set(text.split(/[،,؛;/|]|\s+و(?=\S)/).map(s=>s.trim()).filter(Boolean))].slice(0,6)}
// Skip the Arabic article so «سارة الأحمد» gives «سأ», not «سا».
export function initials(name:string){const parts=name.trim().split(/\s+/).filter(Boolean).map(p=>p.length>3?p.replace(/^ال/,''):p);return (parts.length>1?parts[0][0]+parts[parts.length-1][0]:parts[0]?.slice(0,2)??'؟').toUpperCase()}
export const validTeacherId=(id:string|null)=>Boolean(id&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))

// PostgREST `or` filters treat , ( ) and % specially: keep letters, digits and spaces only.
export function searchTerm(input:string){return input.normalize('NFC').replace(/[^\p{L}\p{N}\s-]/gu,' ').replace(/\s+/g,' ').trim().slice(0,60)}
export function searchFilter(term:string){const t=searchTerm(term);return t?`name.ilike.*${t}*,specialty.ilike.*${t}*,audience.ilike.*${t}*,languages.ilike.*${t}*`:''}
