import {L} from '../../lib/locale-ui'
import {useEffect,useState} from 'react'
import {supabase} from '../../lib/cloud'
import {communityError} from '../../lib/community'
import {PAGE_SIZE,PUBLIC_COLUMNS,initials,languageList,searchFilter,validTeacherId,type TeacherProfile} from '../../lib/teachers'
import {TeacherCard} from './TeacherCard'

const teacherCount=(n:number)=>n===1?'معلم واحد':n===2?'معلمان':n<=10?`${n.toLocaleString('ar-SA')} معلمين`:`${n.toLocaleString('ar-SA')} معلمًا`

function Profile({teacher}:{teacher:TeacherProfile}){
 return <L.article className="teacher-profile" aria-labelledby="teacher-name">
  <L.nav className="breadcrumbs" aria-label="مسار الصفحة"><L.a href="/">الرئيسية</L.a><L.span>/</L.span><L.a href="/teachers">مجلس التعلّم</L.a><L.span>/</L.span><L.span>{teacher.name}</L.span></L.nav>
  <L.div className="teacher-profile-grid">
   <L.aside className="teacher-identity">
    <L.span className="teacher-avatar is-large" aria-hidden="true">{initials(teacher.name)}</L.span>
    <L.h1 id="teacher-name">{teacher.name}</L.h1>
    <L.p className="teacher-specialty">{teacher.specialty}</L.p>
    <L.dl className="teacher-facts">
     <L.div><L.dt>يناسب</L.dt><L.dd>{teacher.audience}</L.dd></L.div>
     <L.div><L.dt>اللغات</L.dt><L.dd className="teacher-langs">{languageList(teacher.languages).map(l=><L.span key={l}>{l}</L.span>)}</L.dd></L.div>
    </L.dl>
    <L.p className="teacher-note">اعتماد الصفحة يعني السماح بعرضها، وليس توثيقًا مستقلًا للمؤهلات. الحجز والتواصل المباشر غير متاحين في هذه المرحلة.</L.p>
   </L.aside>
   <L.div className="teacher-content">
    <L.section><L.h2>من هو؟</L.h2><L.p className="preserve-lines">{teacher.bio}</L.p></L.section>
    <L.section><L.h2>كيف يعلّم</L.h2><L.p className="preserve-lines">{teacher.approach}</L.p></L.section>
    <L.section className="teacher-next"><L.h2>تعلّم في المنصة الآن</L.h2><L.p>إلى أن تُفتح الدروس، يمكنك أن تشارك في لقاءات مجلس الحوار، أو تختبر فهمك في «اكتشف».</L.p><L.div className="teacher-actions"><L.a className="primary" href="/salon">مجلس الحوار ←</L.a><L.a className="text-link" href="/explore">اكتشف</L.a><L.a className="text-link" href="/teachers">كل المعلمين</L.a></L.div></L.section>
   </L.div>
  </L.div>
 </L.article>
}

export function TeacherDirectory(){
 // undefined until mounted: the server cannot see ?teacher=, so SSR and the first client render match.
 const [teacherId,setTeacherId]=useState<string|null|undefined>(undefined)
 const [profile,setProfile]=useState<TeacherProfile|null>(null)
 const [list,setList]=useState<TeacherProfile[]>([])
 const [page,setPage]=useState(0)
 const [more,setMore]=useState(false)
 const [query,setQuery]=useState('')
 const [term,setTerm]=useState('')
 const [language,setLanguage]=useState('')
 const [loading,setLoading]=useState(true)
 const [message,setMessage]=useState('')
 const single=validTeacherId(teacherId??null)
 useEffect(()=>{setTeacherId(new URLSearchParams(location.search).get('teacher'))},[])

 // Debounce typing so each keystroke does not hit the database.
 useEffect(()=>{const t=setTimeout(()=>{setTerm(query);setPage(0)},350);return()=>clearTimeout(t)},[query])

 useEffect(()=>{
  if(teacherId===undefined||teacherId)return
  let active=true;setLoading(true)
  let request=supabase.from('kumeel_teacher_profiles').select(PUBLIC_COLUMNS).order('published_at',{ascending:false}).order('id').range(page*PAGE_SIZE,page*PAGE_SIZE+PAGE_SIZE)
  const filter=searchFilter(term)
  if(filter)request=request.or(filter)
  request.then(({data,error})=>{
   if(!active)return
   if(error){setMessage(communityError(error));setLoading(false);return}
   const rows=(data??[]) as TeacherProfile[]
   // One extra row tells us whether another page exists.
   setMore(rows.length>PAGE_SIZE)
   setList(v=>page===0?rows.slice(0,PAGE_SIZE):[...v,...rows.slice(0,PAGE_SIZE)])
   setMessage('');setLoading(false)
  })
  return()=>{active=false}
 },[page,term,teacherId])

 useEffect(()=>{
  if(!teacherId)return
  if(!single){setMessage('رابط المعلم غير صالح.');setLoading(false);return}
  let active=true
  supabase.from('kumeel_teacher_profiles').select(PUBLIC_COLUMNS).eq('id',teacherId).maybeSingle().then(({data,error})=>{if(!active)return;if(error)setMessage(communityError(error));else if(data){setProfile(data as TeacherProfile);document.title=`${(data as TeacherProfile).name} | مجلس التعلّم`}else setMessage('صفحة المعلم غير متاحة حاليًا.');setLoading(false)})
  return()=>{active=false}
 },[teacherId,single])

 if(teacherId)return <L.section className="wrap section teachers">{profile?<Profile teacher={profile}/>:<L.div className="teachers-state" role="status"><L.p>{loading?'جارٍ تحميل صفحة المعلم…':message}</L.p><L.a className="text-link" href="/teachers">العودة إلى مجلس التعلّم ←</L.a></L.div>}</L.section>

 const languages=[...new Set(list.flatMap(t=>languageList(t.languages)))].sort((a,b)=>a.localeCompare(b,'ar'))
 const shown=language?list.filter(t=>languageList(t.languages).includes(language)):list
 return <L.section className="wrap section teachers" aria-labelledby="teachers-title">
  <L.header className="teachers-hero">
   <L.div>
    <L.span className="section-label">مجلس التعلّم</L.span>
    <L.h1 id="teachers-title">اكتشف من يساعدك على الفهم.</L.h1>
    <L.p>معلمون يعرّفون بتخصصاتهم وطرق تعليمهم. كل صفحة تراجعها الإدارة قبل نشرها؛ الاعتماد إذنٌ بالعرض، وليس توثيقًا مستقلًا للمؤهلات.</L.p>
   </L.div>
   <L.aside className="teachers-join"><L.h2>هل تعلّم؟</L.h2><L.p>قدّم صفحتك التعريفية من مساحة العضو، وستظهر هنا بعد المراجعة.</L.p><L.a className="primary" href="/member#teacher-application">قدّم طلب التدريس ←</L.a></L.aside>
  </L.header>

  <L.div className="teachers-toolbar" role="search">
   <L.label className="teachers-search"><L.span className="sr-only">ابحث عن معلم</L.span><L.input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث بالاسم أو التخصص أو اللغة…" maxLength={60}/></L.label>
   {languages.length>1&&<L.div className="tabs" aria-label="تصفية حسب اللغة"><L.button aria-pressed={!language} onClick={()=>setLanguage('')}>كل اللغات</L.button>{languages.map(l=><L.button key={l} aria-pressed={language===l} onClick={()=>setLanguage(l)}>{l}</L.button>)}</L.div>}
  </L.div>

  <L.p className="teachers-count" role="status">{loading&&!list.length?'جارٍ تحميل المعلمين…':message||(shown.length?`${teacherCount(shown.length)}${term?` لـ«${term}»`:''}`:'')}</L.p>

  {!loading&&!message&&!shown.length&&<L.div className="teachers-empty">{term||language?<><L.h2>لا نتائج مطابقة.</L.h2><L.p>جرّب كلمة أخرى، أو أزل تصفية اللغة.</L.p><L.button className="text-link" onClick={()=>{setQuery('');setLanguage('')}}>امسح البحث</L.button></>:<><L.h2>نستقبل أولى طلبات المعلمين.</L.h2><L.p>تظهر الصفحات هنا بعد مراجعة الإدارة. الدروس والحجوزات في مرحلة لاحقة.</L.p><L.a className="primary" href="/member#teacher-application">كن أول المعلمين ←</L.a></>}</L.div>}

  <L.div className="teachers-grid">{shown.map(t=><TeacherCard key={t.id} teacher={t}/>)}</L.div>
  {more&&<L.div className="teachers-more"><L.button className="text-link" disabled={loading} onClick={()=>setPage(p=>p+1)}>{loading?'جارٍ التحميل…':'عرض المزيد'}</L.button></L.div>}
 </L.section>
}
